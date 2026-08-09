import { describe, expect, it } from "vitest";
import type { Collection, ContentRecord, CourseProject, TiptapDocument } from "@core/course";
import type { ProjectSession } from "@core/projects";
import {
  createLayoutProjectWriter,
  type ProjectFileAccess,
} from "@platform/project-writing/layout-project-writer";

const SESSION: ProjectSession = { id: "s1", name: "Japanese Starter" };

const PROJECT: CourseProject = {
  id: "course_japanese",
  title: "Renamed Course",
  subtitle: "First words",
  description: "A new description.",
  defaultLocale: "en",
  learningLocales: ["ja", "ko"],
  level: "a1",
  estimatedLength: "2 units",
  license: "bySa",
  copyrightHolder: "Alok Singh",
  copyrightYear: "2026",
  coverAssetId: null,
  contributors: [{ id: "c1", name: "Alok Singh", role: "author", links: ["example.com"] }],
  funding: [{ id: "f1", platform: "githubSponsors", url: "github.com/sponsors/x" }],
  sponsors: [{ id: "s1", name: "Nihongo", tier: "gold", url: "nihongo.example" }],
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
    deleteFile(path) {
      files.delete(path);
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
        subtitle: "First words",
        description: "A new description.",
        defaultLocale: "en",
        learningLocales: ["ja", "ko"],
        level: "a1",
        license: "bySa",
        copyrightHolder: "Alok Singh",
        copyrightYear: "2026",
        coverAssetId: null,
        contributors: [{ id: "c1", name: "Alok Singh", role: "author", links: ["example.com"] }],
        funding: [{ id: "f1", platform: "githubSponsors", url: "github.com/sponsors/x" }],
        sponsors: [{ id: "s1", name: "Nihongo", tier: "gold", url: "nihongo.example" }],
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

  it("creates a record file and links it into the collection", async () => {
    const collectionPath = "content/collections/vocabulary.json";
    const files = new Map([
      [
        collectionPath,
        JSON.stringify({
          id: "vocabulary",
          name: "Vocabulary",
          fields: [],
          recordFiles: ["../records/cat.json"],
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const record: ContentRecord = {
      id: "record_dog",
      collectionId: "vocabulary",
      fields: { english: { kind: "text", value: "Dog" } },
    };
    const result = await writer.createRecord(
      SESSION,
      collectionPath,
      "content/records/record_dog.json",
      record,
    );

    expect(result).toEqual({ status: "saved" });
    const recordWritten: unknown = JSON.parse(files.get("content/records/record_dog.json") ?? "");
    expect(recordWritten).toMatchObject({
      id: "record_dog",
      collectionId: "vocabulary",
      fields: { english: { kind: "text", value: "Dog" } },
    });
    const collectionWritten: unknown = JSON.parse(files.get(collectionPath) ?? "");
    expect(collectionWritten).toMatchObject({
      recordFiles: ["../records/cat.json", "../records/record_dog.json"],
    });
  });

  it("deletes a record and unlinks it from the collection", async () => {
    const collectionPath = "content/collections/vocabulary.json";
    const recordPath = "content/records/cat.json";
    const files = new Map([
      [
        collectionPath,
        JSON.stringify({
          id: "vocabulary",
          name: "Vocabulary",
          fields: [],
          recordFiles: ["../records/cat.json", "../records/dog.json"],
        }),
      ],
      [recordPath, JSON.stringify({ id: "record_cat", collectionId: "vocabulary", fields: {} })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.deleteRecord(SESSION, collectionPath, recordPath);

    expect(result).toEqual({ status: "saved" });
    expect(files.has(recordPath)).toBe(false);
    const collectionWritten: unknown = JSON.parse(files.get(collectionPath) ?? "");
    expect(collectionWritten).toMatchObject({ recordFiles: ["../records/dog.json"] });
  });

  it("creates a collection and links it into the manifest", async () => {
    const files = new Map([
      [
        "project.json",
        JSON.stringify({
          format: "asakiri-course",
          collections: ["content/collections/vocabulary.json"],
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const collection: Collection = {
      id: "hiragana",
      name: "Hiragana",
      fields: [
        { id: "field_kana", name: "Kana", kind: "text", cardinality: "one", required: true },
      ],
    };
    const collectionPath = "content/collections/hiragana.json";
    const result = await writer.createCollection(SESSION, collectionPath, collection);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = JSON.parse(files.get(collectionPath) ?? "");
    expect(written).toMatchObject({
      id: "hiragana",
      name: "Hiragana",
      recordFiles: [],
      fields: [
        { id: "field_kana", name: "Kana", kind: "text", cardinality: "one", required: true },
      ],
    });
    const manifest: unknown = JSON.parse(files.get("project.json") ?? "");
    expect(manifest).toMatchObject({
      collections: ["content/collections/vocabulary.json", "content/collections/hiragana.json"],
    });
  });
});
