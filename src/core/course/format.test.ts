// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  COURSE_FORMAT,
  COURSE_FORMAT_VERSION,
  CourseFormatError,
  parseCourse,
  readFormatVersion,
  migrateFile,
} from "@core/course";
import type { CourseFileReader } from "@core/course";

function memoryReader(files: Readonly<Record<string, unknown>>): CourseFileReader {
  return {
    readTextFile: (path) => {
      const file = files[path];
      if (file === undefined) return Promise.reject(new Error(`missing ${path}`));
      return Promise.resolve(JSON.stringify(file));
    },
  };
}

const manifest = {
  format: COURSE_FORMAT,
  formatVersion: COURSE_FORMAT_VERSION,
  project: {
    id: "course_x",
    title: "Course",
    description: "",
    defaultLocale: "en",
    learningLocales: ["ja"],
  },
  collections: [],
  assets: [],
  lessons: ["lessons/one/lesson.json"],
  outline: [{ id: "section_one", title: "Unit", lessonIds: ["lesson_one"] }],
};

describe("readFormatVersion", () => {
  it("reads the canonical envelope", () => {
    expect(readFormatVersion({ format: COURSE_FORMAT, formatVersion: 3 }, "file")).toBe(3);
  });

  it("treats a draft-era file and an unstamped file as version 0", () => {
    expect(readFormatVersion({ format: "asakiri-example", formatVersion: "0.1-draft" }, "f")).toBe(
      0,
    );
    expect(readFormatVersion({ id: "x" }, "f")).toBe(0);
  });

  it("rejects a file claiming a different format", () => {
    expect(() => readFormatVersion({ format: "scorm", formatVersion: 1 }, "f")).toThrow(
      CourseFormatError,
    );
  });
});

describe("migrateFile", () => {
  it("stamps an unversioned file and reports that it migrated", () => {
    const outcome = migrateFile("asset", { id: "asset_x" }, "asset.json");

    expect(outcome.from).toBe(0);
    expect(outcome.migrated).toBe(true);
    expect(outcome.data).toMatchObject({
      format: COURSE_FORMAT,
      formatVersion: COURSE_FORMAT_VERSION,
      id: "asset_x",
    });
  });

  it("leaves a current file untouched", () => {
    const data = { format: COURSE_FORMAT, formatVersion: COURSE_FORMAT_VERSION, id: "a" };
    const outcome = migrateFile("asset", data, "asset.json");

    expect(outcome.migrated).toBe(false);
    expect(outcome.data).toBe(data);
  });

  it("refuses a file from a newer Studio", () => {
    expect(() =>
      migrateFile("manifest", { format: COURSE_FORMAT, formatVersion: 99 }, "project.json"),
    ).toThrow(/newer version of Studio/);
  });
});

describe("unknown content", () => {
  const lesson = {
    id: "lesson_one",
    title: "Lesson",
    parts: [
      { id: "part_a", title: "Known", content: { kind: "exercise", file: "known.json" } },
      { id: "part_b", title: "Future", content: { kind: "exercise", file: "future.json" } },
      { id: "part_c", title: "Alien", content: { kind: "hologram", file: "alien.json" } },
    ],
  };

  const known = {
    id: "exercise_known",
    type: "speaking",
    prompt: [],
    target: { id: "f1", role: "target", binding: { kind: "literal", value: "こんにちは" } },
    evaluation: { kind: "spoken-response", strictness: "standard" },
  };

  const future = { id: "exercise_future", type: "dictation", prompt: [], audioId: "asset_x" };
  const alien = { id: "block_alien", shape: "unknowable" };

  it("keeps a lesson readable when a part uses a newer type", async () => {
    const course = await parseCourse(
      memoryReader({
        "project.json": manifest,
        "lessons/one/lesson.json": lesson,
        "lessons/one/known.json": known,
        "lessons/one/future.json": future,
        "lessons/one/alien.json": alien,
      }),
    );

    const parts = course.lessons[0]?.parts ?? [];
    expect(parts).toHaveLength(3);
    expect(parts[0]?.content.kind).toBe("exercise");
    expect(parts[1]?.content).toMatchObject({
      kind: "unknown",
      declaredKind: "exercise",
      declaredType: "dictation",
    });
    expect(parts[2]?.content).toMatchObject({ kind: "unknown", declaredKind: "hologram" });
  });

  it("preserves the unknown payload verbatim", async () => {
    const course = await parseCourse(
      memoryReader({
        "project.json": manifest,
        "lessons/one/lesson.json": { ...lesson, parts: [lesson.parts[1]] },
        "lessons/one/future.json": future,
      }),
    );

    const content = course.lessons[0]?.parts[0]?.content;
    expect(content?.kind).toBe("unknown");
    if (content?.kind !== "unknown") return;
    expect(content.raw).toMatchObject({ id: "exercise_future", type: "dictation" });
  });

  it("still fails when a known type is malformed", async () => {
    await expect(
      parseCourse(
        memoryReader({
          "project.json": manifest,
          "lessons/one/lesson.json": { ...lesson, parts: [lesson.parts[0]] },
          "lessons/one/known.json": { id: "exercise_known", type: "speaking" },
        }),
      ),
    ).rejects.toThrow(/prompt/);
  });
});
