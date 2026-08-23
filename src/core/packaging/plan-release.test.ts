import { describe, expect, it } from "vitest";
import type { Asset, Course, CourseProject, CourseSources } from "@core/course";
import { akcFileName, planRelease } from "@core/packaging";
import type { ReleaseState, WrittenPack } from "@core/packaging";

function project(overrides: Partial<CourseProject> = {}): CourseProject {
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
    ...overrides,
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

function courseWith(assets: Asset[], unitAssetIds: Record<string, string[]>): Course {
  const lessons = Object.entries(unitAssetIds).map(([unitId, ids]) => ({
    id: `lesson-${unitId}`,
    title: unitId,
    parts: ids.map((assetId, index) => ({
      id: `p-${unitId}-${String(index)}`,
      title: "p",
      content: {
        kind: "composition" as const,
        composition: {
          blocks: [
            {
              id: `b-${assetId}`,
              type: "media" as const,
              binding: { kind: "asset" as const, assetId },
            },
          ],
        },
      },
    })),
  }));
  return {
    project: project(),
    collections: [],
    records: [],
    assets,
    mediaFolders: [],
    lessons,
    outline: Object.keys(unitAssetIds).map((unitId) => ({
      id: unitId,
      title: unitId,
      lessonIds: [`lesson-${unitId}`],
    })),
  };
}

function sources(): CourseSources {
  return {
    project: "project.json",
    collections: {},
    records: {},
    assets: { a1: "media/assets/a1/asset.json" },
    lessons: { "lesson-u1": "lessons/lesson-u1/lesson.json" },
    parts: {},
  };
}

function writtenPack(owner: string | null, partIndex: number, blobShas: string[]): WrittenPack {
  return {
    owner,
    partIndex,
    name: `unit-${owner ?? "common"}-${blobShas.join("")}.akp`,
    sha256: `packsha-${blobShas.join("")}`,
    byteSize: 200,
    entries: blobShas.map((sha256, index) => ({
      sha256,
      offset: index * 100,
      length: 100,
      mime: "image/webp",
      byteSize: 100,
    })),
  };
}

function priorState(
  packs: WrittenPack[],
  assignments: Record<string, string | null>,
): ReleaseState {
  return {
    revision: 1,
    assignments,
    packs: packs.map((written) => ({ blobShas: written.entries.map((e) => e.sha256), written })),
    akc: { name: "beginner-italian.akc", sha256: "oldakc", byteSize: 10 },
    manifest: {
      format: "asakiri-package",
      formatVersion: 1,
      course: {
        id: "course_beginner_italian",
        revision: 1,
        version: "1.0",
        title: "Beginner Italian",
        defaultLocale: "en",
        data: { name: "beginner-italian.akc", sha256: "oldakc", byteSize: 10 },
      },
      packs: [],
      assets: {},
    },
    history: [],
    uploadedMark: null,
  };
}

describe("akcFileName", () => {
  it("derives a stable slug from the course id", () => {
    expect(akcFileName(project())).toBe("beginner-italian.akc");
  });
});

describe("planRelease", () => {
  it("plans a fresh release with one pack per unit and no reuse or orphans", () => {
    const plan = planRelease({
      course: courseWith([asset("a1", "sha-a1")], { u1: ["a1"] }),
      sources: sources(),
      prior: null,
    });
    expect(plan.packsToWrite).toHaveLength(1);
    expect(plan.packsToWrite[0]?.owner).toBe("u1");
    expect(plan.packsToWrite[0]?.entries).toEqual([
      { name: "sha-a1", sourceRelativePath: "media/assets/a1/a1.webp" },
    ]);
    expect(plan.packsToReuse).toHaveLength(0);
    expect(plan.orphanFiles).toHaveLength(0);
  });

  it("includes every course JSON file in the akc", () => {
    const plan = planRelease({
      course: courseWith([asset("a1", "sha-a1")], { u1: ["a1"] }),
      sources: sources(),
      prior: null,
    });
    expect(plan.akc.name).toBe("beginner-italian.akc");
    expect(plan.akc.entries.map((entry) => entry.name)).toEqual([
      "project.json",
      "media/assets/a1/asset.json",
      "lessons/lesson-u1/lesson.json",
    ]);
  });

  it("reuses an unchanged unit pack instead of rewriting it", () => {
    const prior = priorState([writtenPack("u1", 0, ["sha-a1"])], { "sha-a1": "u1" });
    const plan = planRelease({
      course: courseWith([asset("a1", "sha-a1")], { u1: ["a1"] }),
      sources: sources(),
      prior,
    });
    expect(plan.packsToWrite).toHaveLength(0);
    expect(plan.packsToReuse.map((pack) => pack.name)).toEqual(["unit-u1-sha-a1.akp"]);
    expect(plan.orphanFiles).toHaveLength(0);
  });

  it("rewrites a changed unit pack and orphans the old file", () => {
    const prior = priorState([writtenPack("u1", 0, ["sha-old"])], { "sha-a1": "u1" });
    const plan = planRelease({
      course: courseWith([asset("a1", "sha-a1")], { u1: ["a1"] }),
      sources: sources(),
      prior,
    });
    expect(plan.packsToWrite).toHaveLength(1);
    expect(plan.orphanFiles).toEqual(["unit-u1-sha-old.akp"]);
  });

  it("orphans the pack of a deleted unit", () => {
    const prior = priorState([writtenPack("u1", 0, ["sha-a1"]), writtenPack("u2", 0, ["sha-a2"])], {
      "sha-a1": "u1",
      "sha-a2": "u2",
    });
    const plan = planRelease({
      course: courseWith([asset("a1", "sha-a1")], { u1: ["a1"] }),
      sources: sources(),
      prior,
    });
    expect(plan.orphanFiles).toEqual(["unit-u2-sha-a2.akp"]);
  });
});
