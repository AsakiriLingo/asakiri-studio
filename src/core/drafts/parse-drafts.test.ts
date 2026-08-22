// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { CourseFileReader } from "@core/course";
import { DRAFTS_MANIFEST_PATH, parseDrafts } from "@core/drafts";

function mapReader(files: Readonly<Record<string, string>>): CourseFileReader {
  return {
    readTextFile: (relativePath) => {
      const contents = files[relativePath];
      if (contents === undefined) return Promise.reject(new Error(`missing: ${relativePath}`));
      return Promise.resolve(contents);
    },
  };
}

const DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
});

describe("parseDrafts", () => {
  it("returns an empty set when the manifest is absent", async () => {
    const loaded = await parseDrafts(mapReader({}));

    expect(loaded.drafts).toEqual([]);
    expect(loaded.sources.manifest).toBe(DRAFTS_MANIFEST_PATH);
    expect(loaded.sources.bodies).toEqual({});
  });

  it("reads drafts listed in the manifest and their bodies", async () => {
    const loaded = await parseDrafts(
      mapReader({
        [DRAFTS_MANIFEST_PATH]: JSON.stringify({
          drafts: [
            {
              id: "d1",
              title: "Notes",
              updatedAt: "2026-08-23T00:00:00.000Z",
              body: "d1/document.json",
            },
          ],
        }),
        ".asakiri/drafts/d1/document.json": DOC,
      }),
    );

    expect(loaded.drafts).toHaveLength(1);
    expect(loaded.drafts[0]?.id).toBe("d1");
    expect(loaded.drafts[0]?.title).toBe("Notes");
    expect(loaded.drafts[0]?.document.type).toBe("doc");
    expect(loaded.sources.bodies.d1).toBe(".asakiri/drafts/d1/document.json");
  });

  it("skips entries whose body is missing or malformed", async () => {
    const loaded = await parseDrafts(
      mapReader({
        [DRAFTS_MANIFEST_PATH]: JSON.stringify({
          drafts: [
            { id: "ok", title: "Ok", body: "ok/document.json" },
            { id: "gone", title: "Gone", body: "gone/document.json" },
          ],
        }),
        ".asakiri/drafts/ok/document.json": DOC,
        ".asakiri/drafts/gone/document.json": "{ not json",
      }),
    );

    expect(loaded.drafts.map((draft) => draft.id)).toEqual(["ok"]);
    expect(loaded.sources.bodies.gone).toBeUndefined();
  });

  it("falls back to the id for a missing title", async () => {
    const loaded = await parseDrafts(
      mapReader({
        [DRAFTS_MANIFEST_PATH]: JSON.stringify({
          drafts: [{ id: "d2", body: "d2/document.json" }],
        }),
        ".asakiri/drafts/d2/document.json": DOC,
      }),
    );

    expect(loaded.drafts[0]?.title).toBe("d2");
  });
});
