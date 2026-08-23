import { describe, expect, it } from "vitest";
import {
  buildManifest,
  PACKAGE_FORMAT,
  PACKAGE_FORMAT_VERSION,
  type WrittenPack,
} from "@core/packaging";

const course = {
  id: "course_beginner_italian",
  revision: 5,
  version: "2.1",
  title: "Beginner Italian",
  defaultLocale: "en",
};

const akc = { name: "beginner-italian.akc", sha256: "deadbeef", byteSize: 41984 };

function pack(name: string, entries: WrittenPack["entries"]): WrittenPack {
  return { owner: "u1", partIndex: 0, name, sha256: `pack-${name}`, byteSize: 100, entries };
}

describe("buildManifest", () => {
  it("stamps the package format envelope", () => {
    const manifest = buildManifest({ course, akc, packs: [] });
    expect(manifest.format).toBe(PACKAGE_FORMAT);
    expect(manifest.formatVersion).toBe(PACKAGE_FORMAT_VERSION);
  });

  it("carries the course revision, version, and akc data", () => {
    const manifest = buildManifest({ course, akc, packs: [] });
    expect(manifest.course.revision).toBe(5);
    expect(manifest.course.version).toBe("2.1");
    expect(manifest.course.data).toEqual(akc);
  });

  it("indexes every blob by sha256 to its pack and byte range", () => {
    const manifest = buildManifest({
      course,
      akc,
      packs: [
        pack("unit-a.akp", [
          { sha256: "blob1", offset: 0, length: 20, mime: "image/webp", byteSize: 20 },
          { sha256: "blob2", offset: 20, length: 30, mime: "audio/mpeg", byteSize: 30 },
        ]),
      ],
    });
    expect(manifest.assets.blob1).toEqual({
      pack: "unit-a.akp",
      offset: 0,
      length: 20,
      mime: "image/webp",
      byteSize: 20,
    });
    expect(manifest.assets.blob2?.pack).toBe("unit-a.akp");
  });

  it("keeps the first pack location when a blob appears more than once", () => {
    const manifest = buildManifest({
      course,
      akc,
      packs: [
        pack("unit-a.akp", [
          { sha256: "dup", offset: 0, length: 10, mime: "image/webp", byteSize: 10 },
        ]),
        pack("unit-b.akp", [
          { sha256: "dup", offset: 5, length: 10, mime: "image/webp", byteSize: 10 },
        ]),
      ],
    });
    expect(manifest.assets.dup?.pack).toBe("unit-a.akp");
  });

  it("lists every pack in the packs array", () => {
    const manifest = buildManifest({
      course,
      akc,
      packs: [pack("unit-a.akp", []), pack("unit-b.akp", [])],
    });
    expect(manifest.packs.map((entry) => entry.name)).toEqual(["unit-a.akp", "unit-b.akp"]);
  });
});
