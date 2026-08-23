import { describe, expect, it } from "vitest";
import type {
  Asset,
  Composition,
  ContentRecord,
  Course,
  CourseProject,
  CourseSources,
  Exercise,
  Lesson,
  Part,
  TiptapDocument,
} from "@core/course";
import { collectReachableBlobs } from "@core/packaging";

function sourcesFor(course: Course): CourseSources {
  return {
    project: "project.json",
    collections: {},
    records: {},
    assets: Object.fromEntries(
      course.assets.map((asset) => [asset.id, `media/assets/${asset.id}/asset.json`]),
    ),
    lessons: {},
    parts: {},
  };
}

function reachable(course: Course) {
  return collectReachableBlobs(course, sourcesFor(course));
}

function project(overrides: Partial<CourseProject> = {}): CourseProject {
  return {
    id: "course_x",
    title: "X",
    subtitle: "",
    description: "",
    defaultLocale: "en",
    learningLocales: [],
    taughtFlag: "",
    taughtFlagAssetId: null,
    level: "",
    estimatedLength: "",
    version: "1.0",
    releasedOn: "",
    license: "",
    copyrightHolder: "",
    copyrightYear: "",
    coverAssetId: null,
    contributors: [],
    funding: [],
    sponsors: [],
    ...overrides,
  };
}

function asset(id: string, sha256: string | undefined, extra: Partial<Asset> = {}): Asset {
  return {
    id,
    kind: "image",
    label: id,
    availability: sha256 ? "ready" : "placeholder",
    file: sha256 ? `${id}.webp` : null,
    mimeType: "image/webp",
    ...(sha256 ? { sha256, byteSize: 100 } : {}),
    ...extra,
  };
}

function lesson(id: string, parts: Part[]): Lesson {
  return { id, title: id, parts };
}

function compositionPart(id: string, composition: Composition): Part {
  return { id, title: id, content: { kind: "composition", composition } };
}

function course(overrides: Partial<Course> = {}): Course {
  return {
    project: project(),
    collections: [],
    records: [],
    assets: [],
    mediaFolders: [],
    lessons: [],
    outline: [],
    ...overrides,
  };
}

function shaOf(blobs: ReturnType<typeof collectReachableBlobs>, sha: string) {
  return blobs.find((blob) => blob.sha256 === sha);
}

describe("collectReachableBlobs", () => {
  it("homes an asset-bound composition asset in its unit", () => {
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1")],
        lessons: [
          lesson("l1", [
            compositionPart("p1", {
              blocks: [{ id: "b1", type: "media", binding: { kind: "asset", assetId: "a1" } }],
            }),
          ]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(shaOf(blobs, "sha-a1")?.referencingUnitIds).toEqual(["u1"]);
  });

  it("pulls every asset from a record binding", () => {
    const record: ContentRecord = {
      id: "r1",
      collectionId: "c1",
      fields: {
        f1: { kind: "asset", assetId: "a1" },
        f2: {
          kind: "list",
          items: [
            { id: "i1", kind: "asset", assetId: "a2" },
            { id: "i2", kind: "text", value: "hi" },
          ],
        },
      },
    };
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1"), asset("a2", "sha-a2")],
        records: [record],
        lessons: [
          lesson("l1", [
            compositionPart("p1", {
              blocks: [
                { id: "b1", type: "content-card", binding: { kind: "record", recordId: "r1" } },
              ],
            }),
          ]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs.map((blob) => blob.sha256).sort()).toEqual(["sha-a1", "sha-a2"]);
  });

  it("collects assetId nodes and contentRecord bindings from tiptap", () => {
    const record: ContentRecord = {
      id: "r1",
      collectionId: "c1",
      fields: { f1: { kind: "asset", assetId: "a2" } },
    };
    const document: TiptapDocument = {
      type: "doc",
      content: [
        { type: "image", attrs: { assetId: "a1" } },
        { type: "contentRecord", attrs: { binding: { kind: "record", recordId: "r1" } } },
      ],
    };
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1"), asset("a2", "sha-a2")],
        records: [record],
        lessons: [lesson("l1", [{ id: "p1", title: "p1", content: { kind: "tiptap", document } }])],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs.map((blob) => blob.sha256).sort()).toEqual(["sha-a1", "sha-a2"]);
  });

  it("collects fragments and accepted values from a fill-blank exercise", () => {
    const exercise: Exercise = {
      id: "e1",
      type: "fill-blank",
      prompt: [{ id: "fr1", role: "prompt", binding: { kind: "asset", assetId: "a1" } }],
      stem: [{ kind: "blank", id: "bl1" }],
      evaluation: {
        kind: "filled-blanks",
        blanks: [
          {
            blankId: "bl1",
            accepted: { values: [{ binding: { kind: "asset", assetId: "a2" } }] },
          },
        ],
      },
    };
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1"), asset("a2", "sha-a2")],
        lessons: [
          lesson("l1", [{ id: "p1", title: "p1", content: { kind: "exercise", exercise } }]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs.map((blob) => blob.sha256).sort()).toEqual(["sha-a1", "sha-a2"]);
  });

  it("records referencing units in outline order and dedupes shared blobs", () => {
    const part = (id: string) =>
      compositionPart(id, {
        blocks: [{ id: `b-${id}`, type: "media", binding: { kind: "asset", assetId: "a1" } }],
      });
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1")],
        lessons: [lesson("l1", [part("p1")]), lesson("l2", [part("p2")])],
        outline: [
          { id: "u1", title: "U1", lessonIds: ["l1"] },
          { id: "u2", title: "U2", lessonIds: ["l2"] },
        ],
      }),
    );
    expect(shaOf(blobs, "sha-a1")?.referencingUnitIds).toEqual(["u1", "u2"]);
  });

  it("includes cover and taught-flag assets as course-level blobs", () => {
    const blobs = reachable(
      course({
        project: project({ coverAssetId: "cover", taughtFlagAssetId: "flag" }),
        assets: [asset("cover", "sha-cover"), asset("flag", "sha-flag")],
      }),
    );
    expect(shaOf(blobs, "sha-cover")?.referencingUnitIds).toEqual([]);
    expect(shaOf(blobs, "sha-flag")?.referencingUnitIds).toEqual([]);
  });

  it("skips placeholder assets that have no binary", () => {
    const blobs = reachable(
      course({
        assets: [asset("a1", undefined)],
        lessons: [
          lesson("l1", [
            compositionPart("p1", {
              blocks: [{ id: "b1", type: "media", binding: { kind: "asset", assetId: "a1" } }],
            }),
          ]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs).toHaveLength(0);
  });

  it("excludes library assets never placed in a lesson", () => {
    const blobs = reachable(course({ assets: [asset("a1", "sha-a1")] }));
    expect(blobs).toHaveLength(0);
  });

  it("deep-scans unknown content for asset and record references", () => {
    const record: ContentRecord = {
      id: "r1",
      collectionId: "c1",
      fields: { f1: { kind: "asset", assetId: "a2" } },
    };
    const blobs = reachable(
      course({
        assets: [asset("a1", "sha-a1"), asset("a2", "sha-a2")],
        records: [record],
        lessons: [
          lesson("l1", [
            {
              id: "p1",
              title: "p1",
              content: {
                kind: "unknown",
                declaredKind: "exercise",
                declaredType: "future-type",
                raw: { nested: [{ assetId: "a1" }], stimulus: { binding: { recordId: "r1" } } },
              },
            },
          ]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs.map((blob) => blob.sha256).sort()).toEqual(["sha-a1", "sha-a2"]);
  });

  it("merges two asset ids that share the same sha256", () => {
    const blobs = reachable(
      course({
        assets: [asset("a1", "shared"), asset("a2", "shared")],
        lessons: [
          lesson("l1", [
            compositionPart("p1", {
              blocks: [
                { id: "b1", type: "media", binding: { kind: "asset", assetId: "a1" } },
                { id: "b2", type: "media", binding: { kind: "asset", assetId: "a2" } },
              ],
            }),
          ]),
        ],
        outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
      }),
    );
    expect(blobs).toHaveLength(1);
    expect(shaOf(blobs, "shared")?.referencingUnitIds).toEqual(["u1"]);
  });

  it("derives the blob source path from the asset's on-disk directory, not its id", () => {
    const built = course({
      assets: [{ ...asset("asset_audio_x", "sha-x"), file: "kuumin.mp3" }],
      lessons: [
        lesson("l1", [
          compositionPart("p1", {
            blocks: [
              { id: "b1", type: "media", binding: { kind: "asset", assetId: "asset_audio_x" } },
            ],
          }),
        ]),
      ],
      outline: [{ id: "u1", title: "U1", lessonIds: ["l1"] }],
    });
    const sources: CourseSources = {
      project: "project.json",
      collections: {},
      records: {},
      assets: { asset_audio_x: "media/assets/audio-x/asset.json" },
      lessons: {},
      parts: {},
    };
    const blobs = collectReachableBlobs(built, sources);
    expect(shaOf(blobs, "sha-x")?.sourceRelativePath).toBe("media/assets/audio-x/kuumin.mp3");
  });
});
