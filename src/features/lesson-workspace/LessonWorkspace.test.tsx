import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@shared/i18n";
import { LessonWorkspace, type LessonWorkspaceUnit } from "@features/lesson-workspace";

const outline: readonly LessonWorkspaceUnit[] = [
  {
    id: "unit-1",
    title: "Getting started",
    lessons: [
      { id: "lesson-1", title: "Greetings" },
      { id: "lesson-2", title: "Numbers" },
    ],
  },
];

function renderWorkspace(units: readonly LessonWorkspaceUnit[] = outline) {
  return render(
    <I18nProvider locale="en">
      <LessonWorkspace outline={units} />
    </I18nProvider>,
  );
}

describe("LessonWorkspace", () => {
  it("renders the outline units and lessons", () => {
    renderWorkspace();
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    expect(screen.getByText("Greetings")).toBeInTheDocument();
    expect(screen.getByText("Numbers")).toBeInTheDocument();
  });

  it("shows an empty state when there is no outline", () => {
    renderWorkspace([]);
    expect(screen.getByText("No units yet")).toBeInTheDocument();
  });

  it("switches the reference pane between preview and source", () => {
    renderWorkspace();
    expect(screen.getByText("Preview appears here as you build a part")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Source" }));
    expect(screen.getByText("Import a document to reference it here")).toBeInTheDocument();
  });
});
