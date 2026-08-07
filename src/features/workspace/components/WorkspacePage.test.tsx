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

  it("switches to the Media area", () => {
    render(<WorkspacePage messages={messages} onBack={vi.fn()} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Media" }));

    expect(screen.getByRole("button", { name: "Media" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Content" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Project audio, images, and video will appear here.")).toBeVisible();
  });

  it("returns to the Project Hub", () => {
    const handleBack = vi.fn();
    render(<WorkspacePage messages={messages} onBack={handleBack} projectName="Course project" />);

    fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));

    expect(handleBack).toHaveBeenCalledOnce();
  });
});
