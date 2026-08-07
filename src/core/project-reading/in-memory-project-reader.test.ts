import { describe, expect, it } from "vitest";
import { createInMemoryProjectReader } from "@core/project-reading/in-memory-project-reader";
import type { ProjectSession } from "@core/projects";

const session: ProjectSession = { id: "project-1", name: "Japanese Starter" };

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

  it("reports capability from the seed", () => {
    expect(createInMemoryProjectReader().isSupported).toBe(true);
    expect(createInMemoryProjectReader({ isSupported: false }).isSupported).toBe(false);
  });
});
