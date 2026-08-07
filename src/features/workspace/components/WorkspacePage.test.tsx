import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspacePage } from "@features/workspace/components/WorkspacePage";
import type { WorkspaceMessages } from "@features/workspace/i18n/workspace-messages";

const messages: WorkspaceMessages = {
  navigationLabel: "Project workspace",
  backToProjects: "Back to projects",
  areas: {
    content: "Content",
    media: "Media",
    lessons: "Lessons",
  },
  emptyStates: {
    content: {
      title: "Content",
      description: "Reusable project content will appear here.",
    },
    media: {
      title: "Media",
      description: "Project audio, images, and video will appear here.",
    },
    lessons: {
      title: "Lessons",
      description: "Course lessons and their content will appear here.",
    },
  },
  contentActions: {
    createContent: "New content",
  },
  mediaActions: {
    importMedia: "Import media",
  },
  openStates: {
    validating: "Checking this project…",
    invalidTitle: "This project could not be opened.",
    invalidReasons: {
      unreadable: "This project's content could not be read.",
      unknown: "Something went wrong while opening this project.",
    },
  },
};

describe("WorkspacePage", () => {
  it("opens on the Content area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    expect(screen.getByText("Course project")).toBeVisible();
    expect(screen.getByRole("button", { name: "Content" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("region", { name: "Content" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Content" })).toBeVisible();
    expect(screen.getByText("Reusable project content will appear here.")).toBeVisible();
  });

  it("renders the content slot in the Content area", () => {
    render(
      <WorkspacePage
        contentSlot={<div>Collection list</div>}
        messages={messages}
        onBack={vi.fn()}
        projectName="Course project"
      />,
    );

    expect(screen.getByText("Collection list")).toBeVisible();
    expect(screen.queryByText("Reusable project content will appear here.")).toBeNull();
  });

  it("shows a disabled create-content action on the Content area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    const createAction = screen.getByRole("button", { name: "New content" });

    expect(createAction).toBeVisible();
    expect(createAction).toHaveAttribute("aria-disabled", "true");
  });

  it("does not show the create-content action outside the Content area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Media" }));

    expect(screen.queryByRole("button", { name: "New content" })).toBeNull();
  });

  it("switches to the Media area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Media" }));

    expect(screen.getByRole("button", { name: "Media" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Content" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Project audio, images, and video will appear here.")).toBeVisible();
  });

  it("shows a disabled import-media action on the Media area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Media" }));

    const importAction = screen.getByRole("button", { name: "Import media" });

    expect(importAction).toBeVisible();
    expect(importAction).toHaveAttribute("aria-disabled", "true");
  });

  it("switches to the Lessons area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Lessons" }));

    expect(screen.getByRole("button", { name: "Lessons" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Content" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Course lessons and their content will appear here.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "New content" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Import media" })).toBeNull();
  });

  it("returns to the Project Hub", () => {
    const handleBack = vi.fn();
    render(<WorkspacePage messages={messages} onBack={handleBack} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));

    expect(handleBack).toHaveBeenCalledOnce();
  });
});
