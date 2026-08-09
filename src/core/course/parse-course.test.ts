// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CourseParseError, parseCourse } from "@core/course";
import type { CourseFileReader, LessonContent } from "@core/course";

const fixtureRoot = fileURLToPath(
  new URL("../../../examples/courses/japanese-starter", import.meta.url),
);

function diskReader(root: string): CourseFileReader {
  return { readTextFile: (relativePath) => readFile(join(root, relativePath), "utf8") };
}

function isExerciseContent(
  content: LessonContent,
): content is Extract<LessonContent, { kind: "exercise" }> {
  return content.kind === "exercise";
}

describe("parseCourse", () => {
  it("parses the japanese-starter fixture into a course", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));

    expect(course.project.id).toBe("course_japanese_starter");
    expect(course.collections.map((collection) => collection.id)).toEqual([
      "collection_vocabulary",
      "collection_hiragana",
    ]);
    expect(course.records).toHaveLength(12);
    expect(course.assets).toHaveLength(6);
    expect(course.lessons).toHaveLength(9);
    expect(course.outline).toHaveLength(3);
  });

  it("resolves record fields into typed values", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));
    const cat = course.records.find((record) => record.id === "record_cat");

    expect(cat?.fields.field_japanese).toEqual({ kind: "text", value: "猫" });
    expect(cat?.fields.field_pronunciations).toMatchObject({ kind: "list" });
  });

  it("parses every exercise type", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));
    const types = course.lessons
      .map((lesson) => lesson.content)
      .filter(isExerciseContent)
      .map((content) => content.exercise.type);

    expect(new Set(types)).toEqual(
      new Set([
        "multiple-choice",
        "select-image",
        "match-pairs",
        "fill-blank",
        "word-order",
        "listening",
        "speaking",
      ]),
    );
  });

  it("throws a parse error on invalid JSON", async () => {
    const reader: CourseFileReader = { readTextFile: () => Promise.resolve("{ not json") };

    await expect(parseCourse(reader)).rejects.toBeInstanceOf(CourseParseError);
  });

  it("throws a parse error when a binding kind is unsupported", async () => {
    const reader: CourseFileReader = {
      readTextFile: (relativePath) => {
        if (relativePath === "project.json") {
          return Promise.resolve(
            JSON.stringify({
              project: {
                id: "course_x",
                title: "X",
                description: "",
                defaultLocale: "en",
                learningLocales: [],
              },
              collections: [],
              assets: [],
              lessons: ["lessons/broken.json"],
              outline: [],
            }),
          );
        }
        if (relativePath === "lessons/broken.json") {
          return Promise.resolve(
            JSON.stringify({
              id: "lesson_broken",
              type: "exercise",
              title: "Broken",
              content: { kind: "exercise", file: "broken.exercise.json" },
            }),
          );
        }
        return Promise.resolve(
          JSON.stringify({
            id: "exercise_broken",
            type: "speaking",
            prompt: [{ id: "p", role: "primary", binding: { kind: "nope" } }],
            target: {
              id: "t",
              role: "primary",
              binding: { kind: "field", recordId: "r", fieldId: "f" },
            },
            evaluation: { kind: "spoken-response", strictness: "standard" },
          }),
        );
      },
    };

    await expect(parseCourse(reader)).rejects.toBeInstanceOf(CourseParseError);
  });
});
