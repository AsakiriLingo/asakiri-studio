import { describe, expect, it } from "vitest";
import { COURSE_FORMAT, COURSE_FORMAT_VERSION } from "@core/course";
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
  taughtFlag: "jp",
  level: "a1",
  estimatedLength: "2 units",
  version: "",
  releasedOn: "",
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
  formatVersion: 1,
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
    hashFile(path) {
      const contents = files.get(path) ?? "";
      return Promise.resolve({ sha256: `sha-${path}`, byteSize: contents.length });
    },
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
    renameFile(from, to) {
      const contents = files.get(from);
      if (contents !== undefined) {
        files.set(to, contents);
        files.delete(from);
      }
      return Promise.resolve();
    },
    copyFile(sourcePath, path) {
      // Record the copy by storing a marker keyed by the destination path.
      files.set(path, `copied:${sourcePath}`);
      return Promise.resolve();
    },
    copyImage(sourcePath, path) {
      files.set(path, `stripped:${sourcePath}`);
      return Promise.resolve();
    },
    removeDir(path) {
      const prefix = `${path}/`;
      for (const key of [...files.keys()]) {
        if (key === path || key.startsWith(prefix)) files.delete(key);
      }
      return Promise.resolve();
    },
  };
}

function readWritten(files: Map<string, string>, path: string): unknown {
  const parsed: unknown = JSON.parse(files.get(path) ?? "");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return parsed;
  const { format, formatVersion, ...rest } = parsed as Record<string, unknown>;
  expect(format).toBe(COURSE_FORMAT);
  expect(formatVersion).toBe(COURSE_FORMAT_VERSION);
  return rest;
}

describe("layout project writer", () => {
  it("keeps translations for locales the editor is not showing", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      ["project.json", MANIFEST],
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: { en: "Old title", ja: "\u53e4\u3044\u30bf\u30a4\u30c8\u30eb" },
          parts: [],
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updateLesson(SESSION, lessonPath, {
      id: "l1",
      title: "New title",
      parts: [],
    });

    expect(result).toEqual({ status: "saved" });
    expect(readWritten(files, lessonPath)).toMatchObject({
      title: { en: "New title", ja: "\u53e4\u3044\u30bf\u30a4\u30c8\u30eb" },
    });
  });

  it("writes a plain string when the file had no translations", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      ["project.json", MANIFEST],
      [lessonPath, JSON.stringify({ id: "l1", title: "Old title", parts: [] })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    await writer.updateLesson(SESSION, lessonPath, { id: "l1", title: "New title", parts: [] });

    expect(readWritten(files, lessonPath)).toMatchObject({ title: "New title" });
  });

  it("merges the project block and preserves other manifest keys", async () => {
    const files = new Map([["project.json", MANIFEST]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updateProject(SESSION, PROJECT);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, "project.json");
    expect(written).toMatchObject({
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

  it("rewrites the outline while preserving other manifest keys", async () => {
    const files = new Map([["project.json", MANIFEST]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updateOutline(SESSION, [
      { id: "u1", title: "Unit 1", lessonIds: ["l1"] },
      { id: "unit_new", title: "Unit 2", lessonIds: [] },
    ]);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, "project.json");
    expect(written).toMatchObject({
      collections: ["content/collections/vocabulary.json"],
      lessons: ["lessons/intro/lesson.json"],
      outline: [
        { id: "u1", title: "Unit 1", lessonIds: ["l1"] },
        { id: "unit_new", title: "Unit 2", lessonIds: [] },
      ],
    });
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
    const written: unknown = readWritten(files, path);
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

  it("writes record presentations, preserving unknown keys", async () => {
    const path = "content/records/cat.json";
    const files = new Map([
      [
        path,
        JSON.stringify({
          legacy: { itemId: "abc" },
          id: "record_cat",
          collectionId: "vocabulary",
          fields: { english: { kind: "text", value: "Cat" } },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const record: ContentRecord = {
      id: "record_cat",
      collectionId: "vocabulary",
      fields: { english: { kind: "text", value: "Cat" } },
      presentations: [
        {
          id: "pres_1",
          primaryFieldId: "japanese",
          columns: [{ fieldId: "english", visible: true }],
        },
      ],
    };
    const result = await writer.updateRecord(SESSION, path, record);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, path);
    expect(written).toEqual({
      legacy: { itemId: "abc" },
      id: "record_cat",
      collectionId: "vocabulary",
      fields: { english: { kind: "text", value: "Cat" } },
      presentations: [
        {
          id: "pres_1",
          primaryFieldId: "japanese",
          columns: [{ fieldId: "english", visible: true }],
        },
      ],
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
    const written: unknown = readWritten(files, path);
    expect(written).toEqual(document);
  });

  it("creates a lesson file, links it into the manifest, and updates the outline", async () => {
    const files = new Map([["project.json", MANIFEST]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const lessonPath = "lessons/lesson_new/lesson.json";
    const result = await writer.createLesson(
      SESSION,
      lessonPath,
      { id: "lesson_new", title: "New lesson", parts: [] },
      [{ id: "u1", title: "Unit 1", lessonIds: ["l1", "lesson_new"] }],
    );

    expect(result).toEqual({ status: "saved" });
    const lessonWritten: unknown = readWritten(files, lessonPath);
    expect(lessonWritten).toEqual({ id: "lesson_new", title: "New lesson", parts: [] });
    const manifest: unknown = readWritten(files, "project.json");
    expect(manifest).toMatchObject({
      lessons: ["lessons/intro/lesson.json", lessonPath],
      outline: [{ id: "u1", title: "Unit 1", lessonIds: ["l1", "lesson_new"] }],
    });
  });

  it("renames a lesson, preserving its parts and unknown keys", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [{ id: "p1", title: "Section", content: { kind: "tiptap", file: "a.json" } }],
          legacy: { keep: true },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updateLesson(SESSION, lessonPath, {
      id: "l1",
      title: "Getting started",
      parts: [],
    });

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, lessonPath);
    expect(written).toEqual({
      id: "l1",
      title: "Getting started",
      parts: [{ id: "p1", title: "Section", content: { kind: "tiptap", file: "a.json" } }],
      legacy: { keep: true },
    });
  });

  it("sets and clears a part's content title in its lesson file", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [{ id: "p1", title: "Section", content: { kind: "tiptap", file: "a.json" } }],
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const set = await writer.updatePartContentTitle(SESSION, lessonPath, "p1", "First words");
    expect(set).toEqual({ status: "saved" });
    expect(readWritten(files, lessonPath)).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        {
          id: "p1",
          title: "Section",
          content: { kind: "tiptap", file: "a.json", title: "First words" },
        },
      ],
    });

    const cleared = await writer.updatePartContentTitle(SESSION, lessonPath, "p1", "");
    expect(cleared).toEqual({ status: "saved" });
    expect(readWritten(files, lessonPath)).toEqual({
      id: "l1",
      title: "Intro",
      parts: [{ id: "p1", title: "Section", content: { kind: "tiptap", file: "a.json" } }],
    });
  });

  it("renames a part, preserving its content body and sibling parts", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [
            { id: "p1", title: "Warm up", content: { kind: "tiptap", file: "a.json" } },
            { id: "p2", title: "Quiz", content: { kind: "exercise", file: "b.json" } },
          ],
          legacy: { keep: true },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updatePartTitle(SESSION, lessonPath, "p2", "Check yourself");

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, lessonPath);
    expect(written).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        { id: "p1", title: "Warm up", content: { kind: "tiptap", file: "a.json" } },
        { id: "p2", title: "Check yourself", content: { kind: "exercise", file: "b.json" } },
      ],
      legacy: { keep: true },
    });
  });

  it("creates a part: writes its body file and appends the lesson entry", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const bodyPath = "lessons/intro/parts/part_new/document.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [{ id: "p1", title: "Warm up", content: { kind: "tiptap", file: "a.json" } }],
          legacy: { keep: true },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const document: TiptapDocument = { type: "doc", content: [{ type: "paragraph" }] };
    const result = await writer.createPart(
      SESSION,
      lessonPath,
      bodyPath,
      { id: "part_new", title: "Part 2" },
      document,
    );

    expect(result).toEqual({ status: "saved" });
    expect(readWritten(files, bodyPath)).toEqual(document);
    const written: unknown = readWritten(files, lessonPath);
    expect(written).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        { id: "p1", title: "Warm up", content: { kind: "tiptap", file: "a.json" } },
        {
          id: "part_new",
          title: "Part 2",
          content: { kind: "tiptap", file: "parts/part_new/document.json" },
        },
      ],
      legacy: { keep: true },
    });
  });

  it("writes an exercise back to its body file", async () => {
    const path = "lessons/intro/parts/quiz/exercise.json";
    const files = new Map([[path, JSON.stringify({ id: "ex_old", type: "multiple-choice" })]]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.updatePartExercise(SESSION, path, {
      id: "ex_quiz",
      type: "multiple-choice",
      prompt: [
        {
          id: "p1",
          role: "primary",
          binding: { kind: "literal", value: { type: "text", text: "Pick 猫." } },
        },
      ],
      options: [
        {
          id: "opt_a",
          body: [{ id: "b1", role: "primary", binding: { kind: "record", recordId: "rec_cat" } }],
        },
      ],
      evaluation: { kind: "selected-options", select: "one", correctOptionIds: ["opt_a"] },
    });

    expect(result).toEqual({ status: "saved" });
    expect(readWritten(files, path)).toEqual({
      id: "ex_quiz",
      type: "multiple-choice",
      prompt: [
        {
          id: "p1",
          role: "primary",
          binding: { kind: "literal", value: { type: "text", text: "Pick 猫." } },
        },
      ],
      options: [
        {
          id: "opt_a",
          body: [{ id: "b1", role: "primary", binding: { kind: "record", recordId: "rec_cat" } }],
        },
      ],
      evaluation: { kind: "selected-options", select: "one", correctOptionIds: ["opt_a"] },
    });
  });

  it("creates an exercise part: writes exercise.json and appends the lesson entry", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const bodyPath = "lessons/intro/parts/part_quiz/exercise.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [{ id: "p1", title: "Intro text", content: { kind: "tiptap", file: "a.json" } }],
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.createExercisePart(
      SESSION,
      lessonPath,
      bodyPath,
      { id: "part_quiz", title: "Quiz" },
      {
        id: "ex_quiz",
        type: "multiple-choice",
        prompt: [],
        options: [],
        evaluation: { kind: "selected-options", correctOptionIds: [] },
      },
    );

    expect(result).toEqual({ status: "saved" });
    expect(readWritten(files, bodyPath)).toEqual({
      id: "ex_quiz",
      type: "multiple-choice",
      prompt: [],
      options: [],
      evaluation: { kind: "selected-options", correctOptionIds: [] },
    });
    const lesson: unknown = readWritten(files, lessonPath);
    expect(lesson).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        { id: "p1", title: "Intro text", content: { kind: "tiptap", file: "a.json" } },
        {
          id: "part_quiz",
          title: "Quiz",
          content: { kind: "exercise", file: "parts/part_quiz/exercise.json" },
        },
      ],
    });
  });

  it("reorders parts, preserving each entry and unknown lesson keys", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [
            { id: "p1", title: "One", content: { kind: "tiptap", file: "a.json" } },
            { id: "p2", title: "Two", content: { kind: "exercise", file: "b.json" } },
            { id: "p3", title: "Three", content: { kind: "tiptap", file: "c.json" } },
          ],
          legacy: { keep: true },
        }),
      ],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.reorderParts(SESSION, lessonPath, ["p3", "p1", "p2"]);

    expect(result).toEqual({ status: "saved" });
    const written: unknown = readWritten(files, lessonPath);
    expect(written).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        { id: "p3", title: "Three", content: { kind: "tiptap", file: "c.json" } },
        { id: "p1", title: "One", content: { kind: "tiptap", file: "a.json" } },
        { id: "p2", title: "Two", content: { kind: "exercise", file: "b.json" } },
      ],
      legacy: { keep: true },
    });
  });

  it("deletes a part: unlinks it from the lesson and removes its body folder", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const bodyPath = "lessons/intro/parts/quiz/exercise.json";
    const files = new Map([
      [
        lessonPath,
        JSON.stringify({
          id: "l1",
          title: "Intro",
          parts: [
            { id: "p1", title: "Warm up", content: { kind: "tiptap", file: "parts/warm/a.json" } },
            {
              id: "p2",
              title: "Quiz",
              content: { kind: "exercise", file: "parts/quiz/exercise.json" },
            },
          ],
          legacy: { keep: true },
        }),
      ],
      ["lessons/intro/parts/warm/a.json", JSON.stringify({ type: "doc", content: [] })],
      [bodyPath, JSON.stringify({ id: "ex_1", type: "match-pairs" })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.deletePart(SESSION, lessonPath, "p2", bodyPath);

    expect(result).toEqual({ status: "saved" });
    expect(files.has(bodyPath)).toBe(false);
    expect(files.has("lessons/intro/parts/warm/a.json")).toBe(true);
    const written: unknown = readWritten(files, lessonPath);
    expect(written).toEqual({
      id: "l1",
      title: "Intro",
      parts: [
        { id: "p1", title: "Warm up", content: { kind: "tiptap", file: "parts/warm/a.json" } },
      ],
      legacy: { keep: true },
    });
  });

  it("deletes a lesson: unlinks the manifest, rewrites the outline, removes its folder", async () => {
    const lessonPath = "lessons/intro/lesson.json";
    const files = new Map([
      ["project.json", MANIFEST],
      [lessonPath, JSON.stringify({ id: "l1", title: "Intro", parts: [] })],
      ["lessons/intro/parts/intro/document.json", JSON.stringify({ type: "doc", content: [] })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.deleteLesson(SESSION, lessonPath, [
      { id: "u1", title: "Unit 1", lessonIds: [] },
    ]);

    expect(result).toEqual({ status: "saved" });
    expect(files.has(lessonPath)).toBe(false);
    expect(files.has("lessons/intro/parts/intro/document.json")).toBe(false);
    const manifest: unknown = readWritten(files, "project.json");
    expect(manifest).toMatchObject({
      lessons: [],
      outline: [{ id: "u1", title: "Unit 1", lessonIds: [] }],
    });
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
    const recordWritten: unknown = readWritten(files, "content/records/record_dog.json");
    expect(recordWritten).toMatchObject({
      id: "record_dog",
      collectionId: "vocabulary",
      fields: { english: { kind: "text", value: "Dog" } },
    });
    const collectionWritten: unknown = readWritten(files, collectionPath);
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
    const collectionWritten: unknown = readWritten(files, collectionPath);
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
    const written: unknown = readWritten(files, collectionPath);
    expect(written).toMatchObject({
      id: "hiragana",
      name: "Hiragana",
      recordFiles: [],
      fields: [
        { id: "field_kana", name: "Kana", kind: "text", cardinality: "one", required: true },
      ],
    });
    const manifest: unknown = readWritten(files, "project.json");
    expect(manifest).toMatchObject({
      collections: ["content/collections/vocabulary.json", "content/collections/hiragana.json"],
    });
  });

  it("imports an asset: copies the binary, writes the descriptor, links the manifest", async () => {
    const files = new Map([
      ["project.json", JSON.stringify({ format: "asakiri-course", assets: [] })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const assetPath = "media/assets/asset_1/asset.json";
    const binaryPath = "media/assets/asset_1/photo.png";
    const result = await writer.importAsset(SESSION, assetPath, binaryPath, "/tmp/photo.png", {
      id: "asset_1",
      kind: "image",
      label: "photo",
      availability: "ready",
      file: "photo.png",
      mimeType: "image/png",
    });

    expect(result).toEqual({ status: "saved" });
    // Image imports route through copyImage (EXIF stripped), not copyFile.
    expect(files.get(binaryPath)).toBe("stripped:/tmp/photo.png");
    const descriptor: unknown = readWritten(files, assetPath);
    expect(descriptor).toMatchObject({
      id: "asset_1",
      kind: "image",
      file: "photo.png",
      mimeType: "image/png",
      availability: "ready",
      sha256: `sha-${binaryPath}`,
      byteSize: "stripped:/tmp/photo.png".length,
    });
    const manifest: unknown = readWritten(files, "project.json");
    expect(manifest).toMatchObject({ assets: [assetPath] });
  });

  it("imports a non-image asset verbatim (no metadata stripping)", async () => {
    const files = new Map([
      ["project.json", JSON.stringify({ format: "asakiri-course", assets: [] })],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const binaryPath = "media/assets/asset_2/clip.mp3";
    const result = await writer.importAsset(
      SESSION,
      "media/assets/asset_2/asset.json",
      binaryPath,
      "/tmp/clip.mp3",
      {
        id: "asset_2",
        kind: "audio",
        label: "clip",
        availability: "ready",
        file: "clip.mp3",
        mimeType: "audio/mpeg",
      },
    );

    expect(result).toEqual({ status: "saved" });
    expect(files.get(binaryPath)).toBe("copied:/tmp/clip.mp3");
  });

  it("renames an asset: moves the binary and rewrites the descriptor", async () => {
    const assetPath = "media/assets/asset_1/asset.json";
    const files = new Map([
      [assetPath, JSON.stringify({ id: "asset_1", label: "photo", file: "photo.png" })],
      ["media/assets/asset_1/photo.png", "binary"],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.renameAsset(SESSION, assetPath, "photo.png", {
      id: "asset_1",
      kind: "image",
      label: "cat",
      availability: "ready",
      file: "cat.png",
      mimeType: "image/png",
    });

    expect(result).toEqual({ status: "saved" });
    expect(files.has("media/assets/asset_1/photo.png")).toBe(false);
    expect(files.get("media/assets/asset_1/cat.png")).toBe("binary");
    const descriptor: unknown = readWritten(files, assetPath);
    expect(descriptor).toMatchObject({ id: "asset_1", label: "cat", file: "cat.png" });
  });

  it("deletes an asset: unlinks the manifest and removes its folder", async () => {
    const assetPath = "media/assets/asset_1/asset.json";
    const files = new Map([
      [
        "project.json",
        JSON.stringify({
          format: "asakiri-course",
          assets: [assetPath, "media/assets/keep/asset.json"],
        }),
      ],
      [assetPath, JSON.stringify({ id: "asset_1" })],
      ["media/assets/asset_1/photo.png", "copied:/tmp/photo.png"],
    ]);
    const writer = createLayoutProjectWriter(() => fileAccess(files));

    const result = await writer.deleteAsset(SESSION, assetPath);

    expect(result).toEqual({ status: "saved" });
    expect(files.has(assetPath)).toBe(false);
    expect(files.has("media/assets/asset_1/photo.png")).toBe(false);
    const manifest: unknown = readWritten(files, "project.json");
    expect(manifest).toMatchObject({ assets: ["media/assets/keep/asset.json"] });
  });
});
