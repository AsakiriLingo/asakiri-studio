import { describe, expect, it } from "vitest";
import type { ProjectSession } from "@core/projects";
import {
  createLayoutProjectReader,
  type ProjectFileReader,
} from "@platform/project-reading/layout-project-reader";
import { runProjectReaderContract } from "@platform/project-reading/project-reader-contract";

function fakeFileReader(files: Readonly<Record<string, string>>): ProjectFileReader {
  return {
    readTextFile(relativePath) {
      const content = files[relativePath];
      return content === undefined
        ? Promise.reject(new Error(`ENOENT: ${relativePath}`))
        : Promise.resolve(content);
    },
  };
}

runProjectReaderContract("layout (in-memory file reader)", (files) =>
  createLayoutProjectReader(() => fakeFileReader(files)),
);

describe("createLayoutProjectReader", () => {
  it("fails as unavailable when the session cannot be resolved", async () => {
    const session: ProjectSession = { id: "missing", name: "Missing" };
    const reader = createLayoutProjectReader(() => null);

    expect(await reader.listContentCollections(session)).toEqual({
      status: "failed",
      code: "unavailable",
    });
  });
});

describe("createLayoutProjectReader readCourse", () => {
  const session: ProjectSession = { id: "project-1", name: "Japanese Starter" };
  const courseFiles: Readonly<Record<string, string>> = {
    "project.json": JSON.stringify({
      project: {
        id: "course_x",
        title: "X",
        description: "",
        defaultLocale: "en",
        learningLocales: [],
      },
      collections: ["content/vocab.json"],
      assets: [],
      lessons: ["lessons/intro.json"],
      outline: [{ id: "s1", title: "S1", lessonIds: ["lesson_intro"] }],
    }),
    "content/vocab.json": JSON.stringify({
      id: "collection_vocab",
      name: "Vocab",
      fields: [],
      recordFiles: ["records/cat.json"],
    }),
    "content/records/cat.json": JSON.stringify({
      id: "record_cat",
      collectionId: "collection_vocab",
      fields: { field_en: { kind: "text", value: "cat" } },
    }),
    "lessons/intro.json": JSON.stringify({
      id: "lesson_intro",
      title: "Intro",
      parts: [
        {
          id: "part_intro",
          title: "Intro",
          content: { kind: "tiptap", file: "intro.doc.json" },
        },
      ],
    }),
    "lessons/intro.doc.json": JSON.stringify({ type: "doc", content: [] }),
  };

  it("reads a full course from the record-per-file layout", async () => {
    const reader = createLayoutProjectReader(() => fakeFileReader(courseFiles));

    const result = await reader.readCourse(session);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.data.project.id).toBe("course_x");
      expect(result.data.collections).toHaveLength(1);
      expect(result.data.records).toHaveLength(1);
      expect(result.data.lessons).toHaveLength(1);
    }
  });

  it("fails as unavailable when the manifest is missing", async () => {
    const reader = createLayoutProjectReader(() => fakeFileReader({}));

    expect(await reader.readCourse(session)).toEqual({ status: "failed", code: "unavailable" });
  });

  it("fails as unavailable when the session cannot be resolved", async () => {
    const reader = createLayoutProjectReader(() => null);

    expect(await reader.readCourse(session)).toEqual({ status: "failed", code: "unavailable" });
  });
});
