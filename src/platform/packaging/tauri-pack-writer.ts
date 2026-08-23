import { invoke } from "@tauri-apps/api/core";
import type { PackWriter, StoredZipEntry, WrittenZip } from "@core/packaging";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createPackWriter(locations: ProjectLocationRegistry): PackWriter {
  return {
    async writeStoredZip(session, outputRelativePath, entries) {
      const location = locations.get(session.id);
      if (!location) throw new Error("unknownProject");
      return invoke<WrittenZip>("write_stored_zip", {
        rootPath: location.rootPath,
        outputRelativePath,
        entries: entries.map((entry): StoredZipEntry => ({
          name: entry.name,
          sourceRelativePath: entry.sourceRelativePath,
        })),
      });
    },
  };
}
