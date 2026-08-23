import { invoke } from "@tauri-apps/api/core";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { createLayoutProjectReader } from "@platform/project-reading/layout-project-reader";
import { createTauriProjectFileReader } from "@platform/project-reading/tauri-project-file-reader";

function invokeReadCourseFile(rootPath: string, relativePath: string): Promise<string> {
  return invoke<string>("read_course_file", { rootPath, relativePath });
}

export function createProjectReader(
  locations: ProjectLocationRegistry,
  readCourseFile: (
    rootPath: string,
    relativePath: string,
  ) => Promise<string> = invokeReadCourseFile,
): ProjectReader {
  return createLayoutProjectReader((session) => {
    const location = locations.get(session.id);
    if (!location) {
      return null;
    }

    return createTauriProjectFileReader({
      rootPath: location.rootPath,
      readCourseFile,
    });
  });
}
