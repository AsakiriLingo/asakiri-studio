import { describe, expect, it } from "vitest";
import { packFileName, shortHash, unitShortId } from "@core/packaging";

describe("packFileName", () => {
  it("names a unit pack with the unit short id and content hash", () => {
    const name = packFileName("unit_intro", "1a2b3c4d5e6f");
    expect(name).toMatch(/^unit-[0-9a-f]{4}-1a2b3c4d\.akp$/);
  });

  it("names the common pack without a unit segment", () => {
    expect(packFileName(null, "9f0e1d2c3b4a")).toBe("common-9f0e1d2c.akp");
  });

  it("is stable for the same unit id", () => {
    expect(packFileName("unit_intro", "abcdef01")).toBe(packFileName("unit_intro", "abcdef01"));
  });

  it("distinguishes different units", () => {
    expect(unitShortId("unit_a")).not.toBe(unitShortId("unit_b"));
  });
});

describe("shortHash", () => {
  it("truncates to eight characters by default", () => {
    expect(shortHash("0123456789abcdef")).toBe("01234567");
  });
});
