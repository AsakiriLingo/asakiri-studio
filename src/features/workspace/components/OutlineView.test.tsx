import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Lesson, OutlineSection } from "@core/course";
import { OutlineView, type OutlineMessages } from "@features/workspace/components/OutlineView";

const messages: OutlineMessages = {
  empty: "No lessons yet.",
  lessonTypes: {
    "rich-text": "reading",
    "rich-media": "media",
    exercise: "exercise",
  },
};

const lessons: readonly Lesson[] = [
  {
    id: "lesson_welcome",
    type: "rich-text",
    title: "Welcome to Japanese",
    content: { kind: "tiptap", document: { type: "doc" } },
  },
  {
    id: "lesson_cat_exercise",
    type: "exercise",
    title: "Choose the matching word",
    content: {
      kind: "exercise",
      exercise: {
        id: "exercise_x",
        type: "multiple-choice",
        prompt: [],
        options: [],
        evaluation: { kind: "selected-options", correctOptionIds: [] },
      },
    },
  },
];

const outline: readonly OutlineSection[] = [
  {
    id: "section_start",
    title: "Getting started",
    lessonIds: ["lesson_welcome", "lesson_cat_exercise"],
  },
];

describe("OutlineView", () => {
  it("renders units and their lessons with type labels", () => {
    render(<OutlineView lessons={lessons} messages={messages} outline={outline} />);

    const unit = screen.getByRole("region", { name: "Getting started" });
    expect(unit).toBeVisible();
    expect(within(unit).getByText("Welcome to Japanese")).toBeVisible();
    expect(within(unit).getByText("reading")).toBeVisible();
    expect(within(unit).getByText("Choose the matching word")).toBeVisible();
    expect(within(unit).getByText("exercise")).toBeVisible();
  });

  it("falls back to the lesson id when a referenced lesson is missing", () => {
    render(
      <OutlineView
        lessons={[]}
        messages={messages}
        outline={[{ id: "section_x", title: "Section", lessonIds: ["lesson_ghost"] }]}
      />,
    );

    expect(screen.getByText("lesson_ghost")).toBeVisible();
  });

  it("shows the empty message when the outline has no sections", () => {
    render(<OutlineView lessons={lessons} messages={messages} outline={[]} />);

    expect(screen.getByText("No lessons yet.")).toBeVisible();
  });
});
