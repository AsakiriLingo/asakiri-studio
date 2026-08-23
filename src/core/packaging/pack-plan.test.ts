import { describe, expect, it } from "vitest";
import { planPacks, type PlannableBlob } from "@core/packaging";

function blob(sha256: string, referencingUnitIds: string[], byteSize = 100): PlannableBlob {
  return { sha256, byteSize, mime: "image/webp", referencingUnitIds };
}

describe("planPacks", () => {
  it("homes a blob in the earliest referencing unit by outline order", () => {
    const { assignments } = planPacks({
      blobs: [blob("aa", ["u3", "u1"])],
      unitOrder: ["u1", "u2", "u3"],
      prior: {},
      sizeCap: 1000,
    });
    expect(assignments.aa).toBe("u1");
  });

  it("places course-level blobs with no referencing unit in the common pack", () => {
    const { packs, assignments } = planPacks({
      blobs: [blob("cover", [])],
      unitOrder: ["u1"],
      prior: {},
      sizeCap: 1000,
    });
    expect(assignments.cover).toBeNull();
    expect(packs).toHaveLength(1);
    expect(packs[0]?.owner).toBeNull();
  });

  it("keeps a blob in its prior unit even when its earliest use moves (stickiness)", () => {
    const { assignments } = planPacks({
      blobs: [blob("aa", ["u1", "u2"])],
      unitOrder: ["u1", "u2"],
      prior: { aa: "u2" },
      sizeCap: 1000,
    });
    expect(assignments.aa).toBe("u2");
  });

  it("re-homes a blob to the next surviving unit when its prior unit is deleted", () => {
    const { assignments } = planPacks({
      blobs: [blob("aa", ["u2", "u3"])],
      unitOrder: ["u2", "u3"],
      prior: { aa: "u1" },
      sizeCap: 1000,
    });
    expect(assignments.aa).toBe("u2");
  });

  it("re-homes to the common pack when no referencing unit survives", () => {
    const { assignments } = planPacks({
      blobs: [blob("aa", ["u1"])],
      unitOrder: ["u2"],
      prior: { aa: "u1" },
      sizeCap: 1000,
    });
    expect(assignments.aa).toBeNull();
  });

  it("splits a unit that exceeds the size cap into ordered parts", () => {
    const { packs } = planPacks({
      blobs: [blob("a1", ["u1"], 600), blob("a2", ["u1"], 600), blob("a3", ["u1"], 600)],
      unitOrder: ["u1"],
      prior: {},
      sizeCap: 1000,
    });
    const unitPacks = packs.filter((pack) => pack.owner === "u1");
    expect(unitPacks).toHaveLength(3);
    expect(unitPacks.map((pack) => pack.partIndex)).toEqual([0, 1, 2]);
  });

  it("keeps a single oversized blob in its own part rather than dropping it", () => {
    const { packs } = planPacks({
      blobs: [blob("big", ["u1"], 5000)],
      unitOrder: ["u1"],
      prior: {},
      sizeCap: 1000,
    });
    expect(packs).toHaveLength(1);
    expect(packs[0]?.blobs.map((b) => b.sha256)).toEqual(["big"]);
  });

  it("orders blobs within a pack deterministically by hash", () => {
    const { packs } = planPacks({
      blobs: [blob("cc", ["u1"]), blob("aa", ["u1"]), blob("bb", ["u1"])],
      unitOrder: ["u1"],
      prior: {},
      sizeCap: 1000,
    });
    expect(packs[0]?.blobs.map((b) => b.sha256)).toEqual(["aa", "bb", "cc"]);
  });

  it("orders packs by outline order with the common pack last", () => {
    const { packs } = planPacks({
      blobs: [blob("z", []), blob("a", ["u2"]), blob("b", ["u1"])],
      unitOrder: ["u1", "u2"],
      prior: {},
      sizeCap: 1000,
    });
    expect(packs.map((pack) => pack.owner)).toEqual(["u1", "u2", null]);
  });
});
