import { describe, expect, it } from "vitest";
import {
  canAddSubfolder,
  foldersAfterDelete,
  mediaFolderChildren,
  mediaFolderDepth,
  mediaFolderSubtreeIds,
  type MediaFolder,
} from "@core/course/media";

const folders: MediaFolder[] = [
  { id: "a", name: "A", parentId: null },
  { id: "b", name: "B", parentId: "a" },
  { id: "c", name: "C", parentId: "b" },
  { id: "d", name: "D", parentId: null },
];

describe("mediaFolderChildren", () => {
  it("returns direct children of a parent", () => {
    expect(mediaFolderChildren(folders, "a").map((f) => f.id)).toEqual(["b"]);
    expect(mediaFolderChildren(folders, null).map((f) => f.id)).toEqual(["a", "d"]);
  });
});

describe("mediaFolderDepth", () => {
  it("counts depth from the root (root children are depth 1)", () => {
    expect(mediaFolderDepth(folders, "a")).toBe(1);
    expect(mediaFolderDepth(folders, "b")).toBe(2);
    expect(mediaFolderDepth(folders, "c")).toBe(3);
  });
});

describe("canAddSubfolder", () => {
  it("allows root and stops at the max depth", () => {
    expect(canAddSubfolder(folders, null)).toBe(true);
    expect(canAddSubfolder(folders, "a")).toBe(true);
    expect(canAddSubfolder(folders, "b")).toBe(true);
    expect(canAddSubfolder(folders, "c")).toBe(false);
  });
});

describe("mediaFolderSubtreeIds", () => {
  it("includes the folder and all descendants", () => {
    expect(mediaFolderSubtreeIds(folders, "a").sort()).toEqual(["a", "b", "c"]);
    expect(mediaFolderSubtreeIds(folders, "d")).toEqual(["d"]);
  });
});

describe("foldersAfterDelete", () => {
  it("removes the folder and reparents its direct children to its parent", () => {
    const next = foldersAfterDelete(folders, "b");
    expect(next.map((f) => f.id).sort()).toEqual(["a", "c", "d"]);
    expect(next.find((f) => f.id === "c")?.parentId).toBe("a");
  });

  it("reparents children of a root folder to root", () => {
    const next = foldersAfterDelete(folders, "a");
    expect(next.find((f) => f.id === "b")?.parentId).toBeNull();
  });
});
