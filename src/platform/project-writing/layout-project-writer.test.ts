import { describe, expect, it } from "vitest";
import type { ContentRecord, CourseProject, TiptapDocument } from "@core/course";
import type { ProjectSession } from "@core/projects";
import {
  createLayoutProjectWriter,
  type ProjectFileAccess,
} from "@platform/project-writing/layout-project-writer";

const SESSION: ProjectSession = { id: "s1", name: "Japanese Starter" };

const PROJECT: CourseProject = {
  id: "course_japanese",
  title: "Renamed Course",
  description: "A new description.",
  defaultLocale: "en",
  learningLocales: ["ja", "ko"],
};

const MANIFEST = JSON.stringify({
  format: "asakiri-course",
  formatVersion: "0.1",
  project: {
    id: "course_japanese",
    title: "Old Title",
    description: "",
    defaultLocale: "en",
    learningLocales: ["ja"],
  },
  collections: ["content/collections/vocabulary.json"],
  assets: ["media/assets/cat/asset.json"],
  lessons: ["lessons/intro/lesson.json"],
  outline: [{ id: "u1", title: "Unit 1", lessonIds: ["l1"] }],
});

function fileAccess(files: Map<string, string>): ProjectFileAccess {
  return {
    readTextFile(path) {
      const contents = files.get(path);
      return contents === undefined
        ? Promise.reject(new Error(`missing ${path}`))
        : Promise.resolve(contents);
    },
    writeTextFile(path, contents) {
      files.set(path, contents);
      return Promise.resolve();
    },
  };
}

describe("layout project writer", () => {
  it("merges the project block and preserves other manifest keys", async () => {
    const files = new Map([["project.json", MANIFEST]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updateProject(SESSION, PROJECT);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = JSON.parse(files.get("project.json") ?? "");
    expect(written).toMatchObject({
      format: "asakiri-course",
      formatVersion: "0.1",
      project: {
        id: "course_japanese",
        title: "Renamed Course",
        description: "A new description.",
        defaultLocale: "en",
        learningLocales: ["ja", "ko"],
      },
      collections: ["content/collections/vocabulary.json"],
      assets: ["media/assets/cat/asset.json"],
      lessons: ["lessons/intro/lesson.json"],
      outline: [{ id: "u1", title: "Unit 1", lessonIds: ["l1"] }],
    });
  });

  it("reports unavailable when the project cannot be resolved", async () => {
    const writer = createLayoutProjectWriter(() => null);

    const result = await writer.updateProject(SESSION, PROJECT);

    expect(result).toEqual({ status: "failed", code: "unavailable" });
  });

  it("writes a record to its source file, preserving unknown keys", async () => {
    const path = "content/records/cat.json";
    const files = new Map([
      [
        path,
        JSON.stringify({
          $comment: "keep me",
          id: "record_cat",
          collectionId: "vocabulary",
          fields: { english: { kind: "text", value: "cat" } },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const record: ContentRecord = {
      id: "record_cat",
      collectionId: "vocabulary",
      fields: {
        english: { kind: "text", value: "Cat" },
        japanese: { kind: "text", value: "猫" },
      },
    };
    const result = await writer.updateRecord(SESSION, path, record);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = JSON.parse(files.get(path) ?? "");
    expect(written).toEqual({
      $comment: "keep me",
      id: "record_cat",
      collectionId: "vocabulary",
      fields: {
        english: { kind: "text", value: "Cat" },
        japanese: { kind: "text", value: "猫" },
      },
    });
  });

  it("writes a rich-text document to its part body file", async () => {
    const path = "lessons/intro/parts/intro/document.json";
    const files = new Map([[path, JSON.stringify({ type: "doc", content: [] })]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const document: TiptapDocument = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph", content: [{ type: "text", text: "World" }] },
      ],
    };
    const result = await writer.updatePartDocument(SESSION, path, document);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = JSON.parse(files.get(path) ?? "");
    expect(written).toEqual(document);
  });
});
