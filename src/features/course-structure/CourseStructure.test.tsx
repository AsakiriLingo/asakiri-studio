import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Course } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { I18nProvider } from "@shared/i18n";
import { ConfirmProvider } from "@shared/components/confirm-dialog";
import { CourseStructure } from "@features/course-structure";

const saved: ProjectWriteResult = { status: "saved" };

function makeCourse(): Course {
  return {
    project: {
      id: "project",
      title: "Course",
      subtitle: "",
      description: "",
      defaultLocale: "en",
      learningLocales: [],
      taughtFlag: "",
      level: "",
      estimatedLength: "",
      version: "",
      releasedOn: "",
      license: "",
      copyrightHolder: "",
      copyrightYear: "",
      coverAssetId: null,
      contributors: [],
      funding: [],
      sponsors: [],
    },
    collections: [],
    records: [],
    assets: [],
    lessons: [
      { id: "lesson-1", title: "Greetings", parts: [] },
      { id: "lesson-2", title: "Numbers", parts: [] },
    ],
    outline: [
      { id: "unit-1", title: "Unit one", lessonIds: ["lesson-1"] },
      { id: "unit-2", title: "Unit two", lessonIds: ["lesson-2"] },
    ],
  };
}

function renderStructure() {
  return render(
    <I18nProvider locale="en">
      <ConfirmProvider>
        <CourseStructure
          course={makeCourse()}
          onNewUnit={vi.fn().mockResolvedValue(saved)}
          onRenameUnit={vi.fn().mockResolvedValue(saved)}
          onDeleteUnit={vi.fn().mockResolvedValue(saved)}
          onAddLesson={vi.fn().mockResolvedValue(saved)}
          onRenameLesson={vi.fn().mockResolvedValue(saved)}
          onDeleteLesson={vi.fn().mockResolvedValue(saved)}
          onReorderOutline={vi.fn().mockResolvedValue(saved)}
          onOpenLesson={vi.fn()}
        />
      </ConfirmProvider>
    </I18nProvider>,
  );
}

describe("CourseStructure collapsing", () => {
  it("hides a unit's lessons when its header toggle is collapsed", () => {
    renderStructure();

    expect(screen.getByRole("button", { name: /^Greetings/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse Unit one" }));

    expect(screen.queryByRole("button", { name: /^Greetings/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Numbers/ })).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Expand Unit one" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: /^Greetings/ })).toBeInTheDocument();
  });

  it("collapses and expands every unit from the header action", () => {
    renderStructure();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.queryByRole("button", { name: /^Greetings/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Numbers/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));

    expect(screen.getByRole("button", { name: /^Greetings/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Numbers/ })).toBeInTheDocument();
  });

  it("keeps unit reordering handles available while collapsed", () => {
    renderStructure();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.getByRole("button", { name: /Reorder Unit one/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reorder Unit two/ })).toBeInTheDocument();
  });
});
