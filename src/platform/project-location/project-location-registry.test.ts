import { describe, expect, it } from "vitest";
import { ProjectLocationRegistry, type DirectoryHandleLike } from "@platform/project-location";

describe("ProjectLocationRegistry", () => {
  it("keeps native project locations behind the session id", () => {
    const registry = new ProjectLocationRegistry();
    const handle: DirectoryHandleLike = {
      getDirectoryHandle: () => Promise.reject(new Error("unused")),
      getFileHandle: () => Promise.reject(new Error("unused")),
    };

    registry.register("browser-project", { runtime: "browser", handle });
    registry.register("desktop-project", { runtime: "tauri", rootPath: "/courses/Japanese" });

    expect(registry.get("browser-project")).toEqual({ runtime: "browser", handle });
    expect(registry.get("desktop-project")).toEqual({
      runtime: "tauri",
      rootPath: "/courses/Japanese",
    });
    expect(registry.get("missing-project")).toBeNull();
  });
});
