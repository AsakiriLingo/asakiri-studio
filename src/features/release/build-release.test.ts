import { beforeEach, describe, expect, it } from "vitest";
import type { Asset, Course, CourseProject, CourseSources } from "@core/course";
import type { PackWriter, ReleaseState } from "@core/packaging";
import type { ProjectSession } from "@core/projects";
import type { ReleaseClock, ReleaseGateway, ReleaseStateStore } from "@core/packaging";
import { buildRelease } from "@features/release";

const session: ProjectSession = { id: "course_beginner_italian", name: "Beginner Italian" };

function project(): CourseProject {
  return {
    id: "course_beginner_italian",
    title: "Beginner Italian",
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
  };
}

function asset(id: string, sha256: string): Asset {
  return {
    id,
    kind: "image",
    label: id,
    availability: "ready",
    file: `${id}.webp`,
    mimeType: "image/webp",
    sha256,
    byteSize: 100,
  };
}

function course(sha: string): Course {
  return {
    project: project(),
    collections: [],
    records: [],
    assets: [asset("a1", sha)],
    mediaFolders: [],
    lessons: [
      {
        id: "lesson-u1",
        title: "Unit One",
        parts: [
          {
            id: "p1",
            title: "p",
            content: {
              kind: "composition",
              composition: {
                blocks: [{ id: "b1", type: "media", binding: { kind: "asset", assetId: "a1" } }],
              },
            },
          },
        ],
      },
    ],
    outline: [{ id: "u1", title: "Unit One", lessonIds: ["lesson-u1"] }],
  };
}

const sources: CourseSources = {
  project: "project.json",
  collections: {},
  records: {},
  assets: { a1: "media/assets/a1/asset.json" },
  lessons: { "lesson-u1": "lessons/lesson-u1/lesson.json" },
  parts: {},
};

function makeDeps() {
  const files = new Map<string, string>();
  const deleted: string[] = [];
  const renames: [string, string][] = [];
  const states = new Map<string, ReleaseState>();
  let counter = 0;

  const writer: PackWriter = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async writeStoredZip(_session, _outputRelativePath, entries) {
      let offset = 30;
      const written = entries.map((entry) => {
        const record = { name: entry.name, offset, length: 10 };
        offset += 40;
        return record;
      });
      return {
        sha256: `sha_${entries.map((entry) => entry.name).join("_")}`,
        byteSize: offset,
        entries: written,
      };
    },
  };

  const gateway: ReleaseGateway = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async writeText(_session, relativePath, text) {
      files.set(relativePath, text);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async deleteFile(_session, relativePath) {
      deleted.push(relativePath);
      files.delete(relativePath);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async rename(_session, from, to) {
      renames.push([from, to]);
    },
  };

  const store: ReleaseStateStore = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async load(projectId) {
      return states.get(projectId) ?? null;
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async save(projectId, state) {
      states.set(projectId, state);
    },
  };

  const clock: ReleaseClock = {
    now: () => "2026-01-01T00:00:00Z",
    newId: () => `h${String((counter += 1))}`,
  };

  return { deps: { writer, gateway, store, clock }, files, deleted, renames, states };
}

describe("buildRelease", () => {
  let harness: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    harness = makeDeps();
  });

  it("writes a manifest, renames packs to content names, and starts at revision 1", async () => {
    const state = await buildRelease(harness.deps, session, course("sha-a1"), sources);

    expect(state.revision).toBe(1);
    expect(harness.files.has("release/manifest.json")).toBe(true);
    expect(harness.renames.some(([, to]) => /^release\/unit-[0-9a-f]{4}-/.test(to))).toBe(true);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]?.addedOrReplaced.map((file) => file.label)).toContain("Unit One");
  });

  it("indexes each blob in the manifest by its pack", async () => {
    const state = await buildRelease(harness.deps, session, course("sha-a1"), sources);
    const entry = state.manifest.assets["sha-a1"];
    expect(entry?.pack).toMatch(/^unit-/);
    expect(entry?.mime).toBe("image/webp");
  });

  it("is a no-op on a rebuild with no changes", async () => {
    await buildRelease(harness.deps, session, course("sha-a1"), sources);
    const second = await buildRelease(harness.deps, session, course("sha-a1"), sources);
    expect(second.revision).toBe(1);
    expect(second.history).toHaveLength(1);
  });

  it("bumps the revision, writes a new pack, and orphans the old one on a media change", async () => {
    await buildRelease(harness.deps, session, course("sha-a1"), sources);
    const changed = await buildRelease(harness.deps, session, course("sha-a2"), sources);

    expect(changed.revision).toBe(2);
    expect(changed.history).toHaveLength(2);
    expect(harness.deleted.some((path) => path.startsWith("release/unit-"))).toBe(true);
    expect(changed.history[0]?.deleted.length).toBeGreaterThan(0);
  });
});
