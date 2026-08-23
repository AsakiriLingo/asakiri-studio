import { invoke } from "@tauri-apps/api/core";
import type { ReleaseGateway } from "@core/packaging";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createReleaseGateway(locations: ProjectLocationRegistry): ReleaseGateway {
  const rootPathOf = (id: string): string => {
    const location = locations.get(id);
    if (!location) throw new Error("unknownProject");
    return location.rootPath;
  };
  return {
    async writeText(session, relativePath, text) {
      await invoke("write_course_file", {
        rootPath: rootPathOf(session.id),
        relativePath,
        contents: text,
      });
    },
    async deleteFile(session, relativePath) {
      await invoke("delete_course_file", {
        rootPath: rootPathOf(session.id),
        relativePath,
      });
    },
    async rename(session, fromRelativePath, toRelativePath) {
      await invoke("rename_course_file", {
        rootPath: rootPathOf(session.id),
        fromRelativePath,
        toRelativePath,
      });
    },
  };
}
