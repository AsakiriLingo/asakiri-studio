import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ProjectDirectory,
  ProjectDirectoryGateway,
} from "@shared/contracts/project-directory";
import { ProjectHubPage } from "@features/project-hub/components/ProjectHubPage";

const project: ProjectDirectory = {
  id: "course-project",
  name: "Course project",
  locationLabel: "course-project",
  runtime: "desktop",
};

function createGateway(
  openProjectDirectory: ProjectDirectoryGateway["openProjectDirectory"],
  isSupported = true,
): ProjectDirectoryGateway {
  return { isSupported, openProjectDirectory };
}

describe("ProjectHubPage", () => {
  it("disables folder selection when the runtime cannot access directories", () => {
    const gateway = createGateway(vi.fn(), false);

    render(<ProjectHubPage directoryGateway={gateway} />);

    expect(screen.getByRole("button", { name: "Choose folder" })).toBeDisabled();
    expect(screen.getByText(/require a current Chromium browser/i)).toBeVisible();
  });

  it("shows a selected project", async () => {
    const openProjectDirectory = vi.fn().mockResolvedValue(project);
    const gateway = createGateway(openProjectDirectory);

    render(<ProjectHubPage directoryGateway={gateway} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByText("Course project")).toBeVisible();
    expect(screen.getByText("course-project")).toBeVisible();
    expect(openProjectDirectory).toHaveBeenCalledOnce();
  });

  it("returns to idle when the directory picker is cancelled", async () => {
    const gateway = createGateway(vi.fn().mockResolvedValue(null));

    render(<ProjectHubPage directoryGateway={gateway} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("button", { name: "Choose folder" })).toBeEnabled();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("renders adapter failures without throwing the feature tree", async () => {
    const gateway = createGateway(
      vi.fn().mockRejectedValue(new Error("Folder permission was denied.")),
    );

    render(<ProjectHubPage directoryGateway={gateway} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Folder permission was denied.",
    );
  });
});
