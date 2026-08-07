import { describe, expect, it } from "vitest";
import { parseProjectManifestTitle } from "@platform/project-directory/project-manifest-title";

describe("parseProjectManifestTitle", () => {
  it("preserves the title capitalization", () => {
    expect(
      parseProjectManifestTitle(JSON.stringify({ project: { title: "Japanese Starter" } })),
    ).toBe("Japanese Starter");
  });

  it("returns null when the manifest has no usable title", () => {
    expect(parseProjectManifestTitle(JSON.stringify({ project: {} }))).toBeNull();
    expect(parseProjectManifestTitle("not json")).toBeNull();
  });
});
