import { describe, expect, it } from "vitest";
import { ProjectLocationRegistry } from "@platform/project-location";

describe("ProjectLocationRegistry", () => {
  it("keeps native project locations behind the session id", () => {
    const registry = new ProjectLocationRegistry();

    registry.register("desktop-project", { rootPath: "/courses/Japanese" });

    expect(registry.get("desktop-project")).toEqual({ rootPath: "/courses/Japanese" });
    expect(registry.get("missing-project")).toBeNull();
  });
});
