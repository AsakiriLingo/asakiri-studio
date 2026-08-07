import { describe, expect, it } from "vitest";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectSession } from "@core/projects";

export type ContractReaderFactory = (files: Readonly<Record<string, string>>) => ProjectReader;

const session: ProjectSession = { id: "project-1", name: "Japanese Starter" };

const manifest = JSON.stringify({ collections: ["content/collections/vocabulary.json"] });
const vocabulary = JSON.stringify({
  id: "collection_vocabulary",
  name: "Vocabulary",
  recordFiles: ["../records/cat.json", "../records/dog.json", "../records/bird.json"],
});

export function runProjectReaderContract(label: string, makeReader: ContractReaderFactory): void {
  describe(`${label} — ProjectReader contract`, () => {
    it("lists content-collection summaries from the record-per-file layout", async () => {
      const reader = makeReader({
        "project.json": manifest,
        "content/collections/vocabulary.json": vocabulary,
      });

      expect(await reader.listContentCollections(session)).toEqual({
        status: "ready",
        data: [{ id: "collection_vocabulary", name: "Vocabulary", recordCount: 3 }],
      });
    });

    it("returns a ready empty list when the manifest has no collections", async () => {
      const reader = makeReader({ "project.json": JSON.stringify({ collections: [] }) });

      expect(await reader.listContentCollections(session)).toEqual({ status: "ready", data: [] });
    });

    it("fails as unavailable when the manifest is missing", async () => {
      const reader = makeReader({});

      expect(await reader.listContentCollections(session)).toEqual({
        status: "failed",
        code: "unavailable",
      });
    });

    it("fails as unavailable when a collection file is malformed", async () => {
      const reader = makeReader({
        "project.json": manifest,
        "content/collections/vocabulary.json": "{ not json",
      });

      expect(await reader.listContentCollections(session)).toEqual({
        status: "failed",
        code: "unavailable",
      });
    });
  });
}
