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
