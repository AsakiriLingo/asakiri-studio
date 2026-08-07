import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDirectory, ProjectDirectoryGateway } from "@core/projects";
import { ProjectHubPage } from "@features/project-hub/components/ProjectHubPage";
import type { ProjectHubMessages } from "@features/project-hub/i18n/project-hub-messages";

const messages: ProjectHubMessages = {
  title: "Your courses live on your computer.",
  introduction: "Open a course repository to start editing.",
  openProjectTitle: "Open a project",
  openProjectDescription: "Choose the folder that contains one course repository.",
  chooseFolder: "Choose folder",
  openingFolder: "Opening…",
  dialogTitle: "Open course project",
  unsupported: "Local folders require a current Chromium browser.",
  errors: {
    permissionDenied: "Folder permission was denied.",
    unknown: "The project could not be opened.",
    unsupported: "This browser cannot access local project folders.",
  },
  ready: "Ready",
};

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
  return { isSupported, openProjectDirectory, runtime: "desktop" };
}

describe("ProjectHubPage", () => {
  it("disables folder selection when the runtime cannot access directories", () => {
    const gateway = createGateway(vi.fn(), false);

    render(<ProjectHubPage directoryGateway={gateway} messages={messages} />);

    expect(screen.getByRole("button", { name: "Choose folder" })).toBeDisabled();
    expect(screen.getByText(/require a current Chromium browser/i)).toBeVisible();
  });

  it("shows a selected project", async () => {
    const openProjectDirectory = vi.fn().mockResolvedValue(project);
    const gateway = createGateway(openProjectDirectory);

    render(<ProjectHubPage directoryGateway={gateway} messages={messages} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByText("Course project")).toBeVisible();
    expect(screen.getByText("course-project")).toBeVisible();
    expect(openProjectDirectory).toHaveBeenCalledWith({
      dialogTitle: "Open course project",
    });
  });

  it("returns to idle when the directory picker is cancelled", async () => {
    const gateway = createGateway(vi.fn().mockResolvedValue(null));

    render(<ProjectHubPage directoryGateway={gateway} messages={messages} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("button", { name: "Choose folder" })).toBeEnabled();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("localizes adapter failures without exposing raw errors", async () => {
    const gateway = createGateway(
      vi.fn().mockRejectedValue(new Error("Native implementation detail")),
    );

    render(<ProjectHubPage directoryGateway={gateway} messages={messages} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The project could not be opened.");
    expect(screen.queryByText("Native implementation detail")).not.toBeInTheDocument();
  });
});
