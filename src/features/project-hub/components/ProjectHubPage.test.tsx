import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ProjectCreationGateway,
  ProjectDirectory,
  ProjectDirectoryGateway,
} from "@core/projects";
import { ProjectCreationError } from "@core/projects";
import { ProjectHubPage } from "@features/project-hub/components/ProjectHubPage";
import type { ProjectHubMessages } from "@features/project-hub/i18n/project-hub-messages";

const messages: ProjectHubMessages = {
  title: "Your courses live on your computer.",
  introduction: "Open a course repository to start editing.",
  startTitle: "Start",
  chooseFolder: "Choose folder",
  openingFolder: "Opening…",
  dialogTitle: "Open course project",
  errors: {
    permissionDenied: "Folder permission was denied.",
    unknown: "The project could not be opened.",
  },
  ready: "Ready",
  create: {
    title: "Create a course",
    description: "Start a new course.",
    openButton: "Create course",
    nameLabel: "Course name",
    namePlaceholder: "e.g. Japanese Starter",
    createButton: "Create",
    cancelButton: "Cancel",
    creating: "Creating…",
    dialogTitle: "Choose where to save the course",
    errors: {
      alreadyExists: "A folder with that name already exists here.",
      invalidName: "Enter a valid course name.",
      permissionDenied: "Permission to write to that folder was denied.",
      unknown: "The course could not be created.",
    },
  },
};

const project: ProjectDirectory = {
  id: "course-project",
  name: "Course project",
  locationLabel: "course-project",
};

const onProjectOpened = vi.fn();

function createGateway(
  openProjectDirectory: ProjectDirectoryGateway["openProjectDirectory"],
): ProjectDirectoryGateway {
  return { openProjectDirectory };
}

function createCreationGateway(
  createCourse: ProjectCreationGateway["createCourse"] = vi.fn(),
): ProjectCreationGateway {
  return { createCourse };
}

describe("ProjectHubPage", () => {
  it("keeps course creation input inside a focused dialog", async () => {
    render(
      <ProjectHubPage
        creationGateway={createCreationGateway()}
        directoryGateway={createGateway(vi.fn())}
        messages={messages}
        onProjectOpened={onProjectOpened}
      />,
    );

    expect(screen.queryByRole("textbox", { name: "Course name" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create course" }));

    expect(screen.getByRole("dialog", { name: "Create a course" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Course name" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create a course" })).not.toBeInTheDocument();
    });
  });

  it("shows a selected project", async () => {
    const openProjectDirectory = vi.fn().mockResolvedValue(project);
    const handleProjectOpened = vi.fn();

    render(
      <ProjectHubPage
        creationGateway={createCreationGateway()}
        directoryGateway={createGateway(openProjectDirectory)}
        messages={messages}
        onProjectOpened={handleProjectOpened}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByText("Course project")).toBeVisible();
    expect(screen.getByText("course-project")).toBeVisible();
    expect(openProjectDirectory).toHaveBeenCalledWith({ dialogTitle: "Open course project" });
    expect(handleProjectOpened).toHaveBeenCalledWith(project);
  });

  it("returns to idle when the directory picker is cancelled", async () => {
    const handleProjectOpened = vi.fn();

    render(
      <ProjectHubPage
        creationGateway={createCreationGateway()}
        directoryGateway={createGateway(vi.fn().mockResolvedValue(null))}
        messages={messages}
        onProjectOpened={handleProjectOpened}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("button", { name: "Choose folder" })).toBeEnabled();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(handleProjectOpened).not.toHaveBeenCalled();
  });

  it("localizes adapter failures without exposing raw errors", async () => {
    render(
      <ProjectHubPage
        creationGateway={createCreationGateway()}
        directoryGateway={createGateway(vi.fn().mockRejectedValue(new Error("Native detail")))}
        messages={messages}
        onProjectOpened={onProjectOpened}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose folder" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The project could not be opened.");
    expect(screen.queryByText("Native detail")).not.toBeInTheDocument();
  });

  it("creates a course and opens it", async () => {
    const created: ProjectDirectory = {
      id: "new-course",
      name: "New Course",
      locationLabel: "New Course",
    };
    const createCourse = vi.fn().mockResolvedValue(created);
    const handleProjectOpened = vi.fn();

    render(
      <ProjectHubPage
        creationGateway={createCreationGateway(createCourse)}
        directoryGateway={createGateway(vi.fn())}
        messages={messages}
        onProjectOpened={handleProjectOpened}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    fireEvent.change(screen.getByLabelText("Course name"), { target: { value: "New Course" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(handleProjectOpened).toHaveBeenCalledWith(created);
    });
    expect(createCourse).toHaveBeenCalledWith({
      name: "New Course",
      dialogTitle: "Choose where to save the course",
    });
  });

  it("localizes creation failures without exposing raw errors", async () => {
    const createCourse = vi.fn().mockRejectedValue(new ProjectCreationError("alreadyExists"));

    render(
      <ProjectHubPage
        creationGateway={createCreationGateway(createCourse)}
        directoryGateway={createGateway(vi.fn())}
        messages={messages}
        onProjectOpened={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    fireEvent.change(screen.getByLabelText("Course name"), { target: { value: "Duplicate" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A folder with that name already exists here.",
    );
  });
});
