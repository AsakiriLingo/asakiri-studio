import { readTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { createLayoutProjectReader } from "@platform/project-reading/layout-project-reader";
import { createTauriProjectFileReader } from "@platform/project-reading/tauri-project-file-reader";

export function createProjectReader(
  locations: ProjectLocationRegistry,
  readTauriTextFile: (path: string) => Promise<string> = readTextFile,
): ProjectReader {
  return createLayoutProjectReader((session) => {
    const location = locations.get(session.id);
    if (!location) {
      return null;
    }

    return createTauriProjectFileReader({
      rootPath: location.rootPath,
      readTextFile: readTauriTextFile,
    });
  });
}
