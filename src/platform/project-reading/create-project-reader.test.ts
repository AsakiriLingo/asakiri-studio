import { describe, expect, it } from "vitest";
import type { ProjectSession } from "@core/projects";
import { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { createProjectReader } from "@platform/project-reading/create-project-reader";

const session: ProjectSession = { id: "project-1", name: "Japanese Starter" };

describe("createProjectReader", () => {
  it("reads the selected Tauri project through its registered location", async () => {
    const locations = new ProjectLocationRegistry();
    locations.register(session.id, { rootPath: "/courses/Japanese Starter" });
    const files: Readonly<Record<string, string>> = {
      "project.json": JSON.stringify({
        collections: ["content/collections/vocabulary.json"],
      }),
      "content/collections/vocabulary.json": JSON.stringify({
        id: "vocabulary",
        name: "Vocabulary",
        recordFiles: ["content/records/cat.json"],
      }),
    };
    const reader = createProjectReader(locations, (rootPath, relativePath) => {
      const content = files[relativePath];
      return content === undefined
        ? Promise.reject(new Error(`Missing ${rootPath}/${relativePath}`))
        : Promise.resolve(content);
    });

    expect(await reader.listContentCollections(session)).toEqual({
      status: "ready",
      data: [{ id: "vocabulary", name: "Vocabulary", recordCount: 1 }],
    });
  });

  it("fails when the session has no registered project location", async () => {
    const reader = createProjectReader(new ProjectLocationRegistry(), () => Promise.resolve(""));

    expect(await reader.listContentCollections(session)).toEqual({
      status: "failed",
      code: "unavailable",
    });
  });
});
