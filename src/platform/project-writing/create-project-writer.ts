import { readTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectWriter } from "@core/project-writing";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { createLayoutProjectWriter } from "@platform/project-writing/layout-project-writer";
import { createTauriProjectFileWriter } from "@platform/project-writing/tauri-project-file-writer";

export function createProjectWriter(
  locations: ProjectLocationRegistry,
  readTauriTextFile: (path: string) => Promise<string> = readTextFile,
): ProjectWriter {
  return createLayoutProjectWriter((session) => {
    const location = locations.get(session.id);
    if (!location) {
      return null;
    }

    return createTauriProjectFileWriter({
      rootPath: location.rootPath,
      readTextFile: readTauriTextFile,
    });
  });
}
