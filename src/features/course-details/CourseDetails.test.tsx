import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Course, CourseProject } from "@core/course";
import { getMessages, I18nProvider } from "@shared/i18n";
import { CourseDetails, type CourseDetailsProps } from "@features/course-details/CourseDetails";

const messages = getMessages("en");
const t = messages.details;

const PROJECT: CourseProject = {
  id: "course_japanese",
  title: "Japanese Starter",
  subtitle: "First words",
  description: "",
  defaultLocale: "en",
  learningLocales: ["ja"],
  taughtFlag: "jp",
  taughtFlagAssetId: null,
  level: "a1",
  estimatedLength: "",
  version: "",
  releasedOn: "",
  license: "bySa",
  copyrightHolder: "",
  copyrightYear: "",
  coverAssetId: null,
  contributors: [{ id: "c1", name: "Alok", role: "author", links: [] }],
  funding: [],
  sponsors: [],
};

const COURSE: Course = {
  project: PROJECT,
  collections: [],
  records: [],
  assets: [],
  lessons: [],
  outline: [],
};

type SaveUpdate = (current: CourseProject) => CourseProject;

function renderDetails() {
  const onSaveProject = vi.fn<(update: SaveUpdate) => Promise<{ status: "saved" }>>(() =>
    Promise.resolve({ status: "saved" }),
  );
  const props: CourseDetailsProps = {
    course: COURSE,
    location: "/tmp/course",
    onSaveProject,
    onRevealFolder: vi.fn(),
    onImportImage: vi.fn().mockResolvedValue(null),
    onLoadAssetPreview: vi.fn().mockResolvedValue(null),
  };
  const view = render(
    <I18nProvider locale="en">
      <CourseDetails {...props} />
    </I18nProvider>,
  );
  return { view, onSaveProject };
}

function lastUpdate(onSaveProject: ReturnType<typeof vi.fn>): SaveUpdate {
  const calls = onSaveProject.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("onSaveProject was not called");
  return call[0] as SaveUpdate;
}

function input(view: { container: HTMLElement }, name: string): HTMLInputElement {
  const element = view.container.querySelector(`input[name="${name}"]`);
  if (!(element instanceof HTMLInputElement)) throw new Error(`missing input ${name}`);
  return element;
}

describe("CourseDetails", () => {
  it("patches fields onto the latest project instead of the render snapshot", () => {
    const { view, onSaveProject } = renderDetails();

    fireEvent.blur(input(view, "title"), { target: { value: "Renamed Course" } });
    expect(onSaveProject).toHaveBeenCalledTimes(1);

    const update = lastUpdate(onSaveProject);
    const merged = update({ ...PROJECT, subtitle: "Changed meanwhile" });
    expect(merged.title).toBe("Renamed Course");
    expect(merged.subtitle).toBe("Changed meanwhile");
  });

  it("does not save when the field value is unchanged", () => {
    const { view, onSaveProject } = renderDetails();

    fireEvent.blur(input(view, "title"), { target: { value: PROJECT.title } });
    expect(onSaveProject).not.toHaveBeenCalled();
  });

  it("updates the taught language against the latest locales", () => {
    const { view, onSaveProject } = renderDetails();

    fireEvent.blur(input(view, "target-language"), { target: { value: "ko" } });

    const update = lastUpdate(onSaveProject);
    const merged = update({ ...PROJECT, learningLocales: ["ja", "zh"] });
    expect(merged.learningLocales).toEqual(["ko", "zh"]);
  });

  it("adds contributors to the latest list, not the rendered one", () => {
    const { onSaveProject } = renderDetails();

    fireEvent.click(screen.getByRole("button", { name: t.contributorsTitle }));

    const addButtons = screen.getAllByRole("button", { name: messages.common.add });
    const contributorsAdd = addButtons[0];
    if (!contributorsAdd) throw new Error("missing add button");
    fireEvent.click(contributorsAdd);

    const update = lastUpdate(onSaveProject);
    const other = { id: "c2", name: "Mika", role: "editor", links: [] };
    const merged = update({ ...PROJECT, contributors: [...PROJECT.contributors, other] });
    expect(merged.contributors).toHaveLength(3);
    expect(merged.contributors.map((item) => item.name)).toContain("Mika");
  });

  it("renames and removes a contributor functionally", () => {
    const { onSaveProject } = renderDetails();

    fireEvent.click(screen.getByRole("button", { name: t.contributorsTitle }));

    fireEvent.blur(screen.getByLabelText(t.nameLabel), { target: { value: "Alok S" } });
    let update = lastUpdate(onSaveProject);
    expect(update(PROJECT).contributors[0]?.name).toBe("Alok S");

    const format = messages.common.remove.replace("{label}", "Alok");
    fireEvent.click(screen.getByRole("button", { name: format }));
    update = lastUpdate(onSaveProject);
    expect(update(PROJECT).contributors).toHaveLength(0);
  });
});
