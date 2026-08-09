import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Course } from "@core/course";
import { createInMemoryProjectReader, type ProjectReader } from "@core/project-reading";
import type { ProjectSession } from "@core/projects";
import { WorkspaceOpen } from "@features/workspace/components/WorkspaceOpen";
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
  outline: {
    empty: "This course has no lessons in its outline yet.",
    lessonTypes: {
      "rich-text": "reading",
      "rich-media": "media",
      exercise: "exercise",
    },
  },
  openStates: {
    validating: "Checking this project…",
    invalidTitle: "This project could not be opened.",
    invalidReasons: {
      unreadable:
        "This project's content could not be read. Return to your projects and open it again.",
      unknown:
        "Something went wrong while opening this project. Return to your projects and try again.",
    },
  },
};

const session: ProjectSession = { id: "project-1", name: "Course project" };

describe("WorkspaceOpen", () => {
  it("renders the workspace directly when no reader is provided", () => {
    render(<WorkspaceOpen messages={messages} onBack={vi.fn()} session={session} />);

    expect(screen.getByRole("button", { name: "New content" })).toBeVisible();
  });

  it("shows the validating state while the reader is pending", () => {
    const pendingReader: ProjectReader = {
      listContentCollections: (): ReturnType<ProjectReader["listContentCollections"]> =>
        new Promise(() => undefined),
      readCourse: (): ReturnType<ProjectReader["readCourse"]> => new Promise(() => undefined),
    };

    render(
      <WorkspaceOpen
        messages={messages}
        onBack={vi.fn()}
        reader={pendingReader}
        session={session}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Checking this project…");
  });

  it("shows the workspace once a valid project resolves", async () => {
    const reader = createInMemoryProjectReader({
      contentCollectionsBySession: {
        "project-1": [{ id: "vocabulary", name: "Vocabulary", recordCount: 3 }],
      },
    });

    render(
      <WorkspaceOpen
        messages={messages}
        onBack={vi.fn()}
        reader={reader}
        renderContent={(collections) => (
          <div>{collections.map((collection) => collection.name).join(", ")}</div>
        )}
        session={session}
      />,
    );

    expect(await screen.findByRole("button", { name: "New content" })).toBeVisible();
    expect(screen.getByText("Vocabulary")).toBeVisible();
  });

  it("renders the course outline in the Lessons area", async () => {
    const course: Course = {
      project: {
        id: "course_x",
        title: "Course project",
        description: "",
        defaultLocale: "en",
        learningLocales: ["ja"],
      },
      collections: [],
      records: [],
      assets: [],
      lessons: [
        {
          id: "lesson_welcome",
          type: "rich-text",
          title: "Welcome to Japanese",
          content: { kind: "tiptap", document: { type: "doc" } },
        },
      ],
      outline: [{ id: "section_start", title: "Getting started", lessonIds: ["lesson_welcome"] }],
    };
    const reader = createInMemoryProjectReader({
      contentCollectionsBySession: { "project-1": [] },
      courseBySession: { "project-1": course },
    });

    render(
      <WorkspaceOpen messages={messages} onBack={vi.fn()} reader={reader} session={session} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Lessons" }));

    const unit = await screen.findByRole("region", { name: "Getting started" });
    expect(within(unit).getByText("Welcome to Japanese")).toBeVisible();
  });

  it("shows a localized invalid state without exposing raw codes", async () => {
    const reader = createInMemoryProjectReader({ failWithCode: "unavailable" });

    render(
      <WorkspaceOpen messages={messages} onBack={vi.fn()} reader={reader} session={session} />,
    );

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("This project could not be opened.");
    expect(alert).toHaveTextContent("This project's content could not be read.");
    expect(alert).not.toHaveTextContent("unavailable");
  });

  it("maps an unknown read failure to the unknown reason", async () => {
    const reader = createInMemoryProjectReader({ failWithCode: "unknown" });

    render(
      <WorkspaceOpen messages={messages} onBack={vi.fn()} reader={reader} session={session} />,
    );

    expect(
      await screen.findByText(/Something went wrong while opening this project/),
    ).toBeVisible();
  });

  it("returns to the Project Hub from the invalid state", async () => {
    const handleBack = vi.fn();
    const reader = createInMemoryProjectReader({ failWithCode: "unknown" });

    render(
      <WorkspaceOpen messages={messages} onBack={handleBack} reader={reader} session={session} />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Back to projects" }));

    expect(handleBack).toHaveBeenCalledOnce();
  });
});
