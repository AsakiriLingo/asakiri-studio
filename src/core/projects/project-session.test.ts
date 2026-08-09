import { describe, expect, it } from "vitest";
import type { ProjectDirectory } from "@core/projects/project-directory";
import { createProjectSession } from "@core/projects/project-session";

describe("createProjectSession", () => {
  it("derives a stable path-free identity from the selected directory", () => {
    const directory: ProjectDirectory = {
      id: "project-1",
      name: "Japanese Starter",
      locationLabel: "Documents / courses",
    };

    const session = createProjectSession(directory);

    expect(session).toEqual({ id: "project-1", name: "Japanese Starter" });
  });
});
