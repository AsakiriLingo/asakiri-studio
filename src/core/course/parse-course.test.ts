// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CourseParseError, parseCourse, parseCourseWithSources } from "@core/course";
import type { CourseFileReader, PartContent } from "@core/course";

const fixtureRoot = fileURLToPath(
  new URL("../../../examples/courses/japanese-starter", import.meta.url),
);

function diskReader(root: string): CourseFileReader {
  return { readTextFile: (relativePath) => readFile(join(root, relativePath), "utf8") };
}

function isExerciseContent(
  content: PartContent,
): content is Extract<PartContent, { kind: "exercise" }> {
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
    expect(course.lessons).toHaveLength(3);
    expect(course.lessons.flatMap((lesson) => lesson.parts)).toHaveLength(9);
    expect(course.outline).toHaveLength(2);
  });

  it("retains project-relative source paths for each entity", async () => {
    const { sources } = await parseCourseWithSources(diskReader(fixtureRoot));

    expect(sources.project).toBe("project.json");
    expect(sources.records.record_cat).toBe("content/records/cat.json");
    expect(sources.collections.collection_vocabulary).toBe("content/collections/vocabulary.json");
    expect(sources.assets.asset_cat_image).toBe("media/assets/cat-image/asset.json");
    expect(sources.lessons.lesson_meet_neko).toBe("lessons/meet-neko/lesson.json");
    expect(Object.keys(sources.parts).length).toBeGreaterThan(0);
  });

  it("resolves record fields into typed values", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));
    const cat = course.records.find((record) => record.id === "record_cat");

    expect(cat?.fields.field_japanese).toEqual({ kind: "text", value: "猫" });
    expect(cat?.fields.field_pronunciations).toMatchObject({ kind: "list" });
  });

  it("parses record presentations", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));
    const cat = course.records.find((record) => record.id === "record_cat");

    expect(cat?.presentations).toEqual([
      {
        id: "presentation_cat_primary",
        primaryFieldId: "field_japanese",
        columns: [{ fieldId: "field_english", visible: true }],
      },
    ]);
  });

  it("parses every exercise type", async () => {
    const course = await parseCourse(diskReader(fixtureRoot));
    const types = course.lessons
      .flatMap((lesson) => lesson.parts)
      .map((part) => part.content)
      .filter(isExerciseContent)
      .map((content) => content.exercise.type);

    expect(new Set(types)).toEqual(
      new Set([
        "multiple-choice",
        "match-pairs",
        "fill-blank",
        "word-order",
        "listening",
        "speaking",
      ]),
    );
  });

  it("parses media folders and asset folderId, defaulting to no folders", async () => {
    const withFolders: CourseFileReader = {
      readTextFile: (relativePath) => {
        if (relativePath === "project.json") {
          return Promise.resolve(
            JSON.stringify({
              project: {
                id: "c",
                title: "C",
                description: "",
                defaultLocale: "en",
                learningLocales: [],
              },
              collections: [],
              assets: ["media/assets/a1/asset.json"],
              lessons: [],
              outline: [],
              mediaFolders: [
                { id: "f1", name: "Chapter 1", parentId: null },
                { id: "f2", name: "Audio", parentId: "f1" },
              ],
            }),
          );
        }
        return Promise.resolve(
          JSON.stringify({
            id: "a1",
            kind: "image",
            label: "a1",
            availability: "ready",
            file: "a1.png",
            mimeType: "image/png",
            folderId: "f2",
          }),
        );
      },
    };
    const course = await parseCourse(withFolders);
    expect(course.mediaFolders).toEqual([
      { id: "f1", name: "Chapter 1", parentId: null },
      { id: "f2", name: "Audio", parentId: "f1" },
    ]);
    expect(course.assets[0]?.folderId).toBe("f2");
  });

  it("defaults media folders to empty when the manifest omits them", async () => {
    const noFolders: CourseFileReader = {
      readTextFile: () =>
        Promise.resolve(
          JSON.stringify({
            project: {
              id: "c",
              title: "C",
              description: "",
              defaultLocale: "en",
              learningLocales: [],
            },
            collections: [],
            assets: [],
            lessons: [],
            outline: [],
          }),
        ),
    };
    const course = await parseCourse(noFolders);
    expect(course.mediaFolders).toEqual([]);
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
              title: "Broken",
              parts: [
                {
                  id: "part_broken",
                  title: "Broken",
                  content: { kind: "exercise", file: "broken.exercise.json" },
                },
              ],
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
