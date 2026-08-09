import { describe, expect, it } from "vitest";
import type { Course } from "@core/course";
import { createInMemoryProjectReader } from "@core/project-reading/in-memory-project-reader";
import type { ProjectSession } from "@core/projects";

const session: ProjectSession = { id: "project-1", name: "Japanese Starter" };

const course: Course = {
  project: {
    id: "course_japanese_starter",
    title: "Japanese Starter",
    subtitle: "",
    description: "",
    defaultLocale: "en",
    learningLocales: ["ja"],
    level: "",
    estimatedLength: "",
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
  lessons: [],
  outline: [],
};

describe("createInMemoryProjectReader", () => {
  it("returns the seeded content collections for a known session", async () => {
    const reader = createInMemoryProjectReader({
      contentCollectionsBySession: {
        "project-1": [{ id: "vocabulary", name: "Vocabulary", recordCount: 3 }],
      },
    });

    const result = await reader.listContentCollections(session);

    expect(result).toEqual({
      status: "ready",
      data: [{ id: "vocabulary", name: "Vocabulary", recordCount: 3 }],
    });
  });

  it("returns a ready empty list for an unknown session", async () => {
    const reader = createInMemoryProjectReader();

    const result = await reader.listContentCollections(session);

    expect(result).toEqual({ status: "ready", data: [] });
  });

  it("returns a typed failure when seeded to fail", async () => {
    const reader = createInMemoryProjectReader({ failWithCode: "unavailable" });

    const result = await reader.listContentCollections(session);

    expect(result).toEqual({ status: "failed", code: "unavailable" });
  });

  it("returns the seeded course for a known session", async () => {
    const reader = createInMemoryProjectReader({ courseBySession: { "project-1": course } });

    const result = await reader.readCourse(session);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.data.course).toEqual(course);
    }
  });

  it("fails as unavailable when no course is seeded", async () => {
    const reader = createInMemoryProjectReader();

    expect(await reader.readCourse(session)).toEqual({ status: "failed", code: "unavailable" });
  });
});
