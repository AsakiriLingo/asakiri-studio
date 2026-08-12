import { invoke } from "@tauri-apps/api/core";
import type { AssetReader } from "@core/project-media";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { projectRelativePathSegments } from "@platform/project-reading/project-relative-path";

export function createAssetReader(locations: ProjectLocationRegistry): AssetReader {
  return {
    async readAssetDataUrl(session, relativePath, mimeType) {
      const location = locations.get(session.id);
      if (!location) return null;
      try {
        projectRelativePathSegments(relativePath);
        const base64 = await invoke<string>("read_course_file_base64", {
          rootPath: location.rootPath,
          relativePath,
        });
        return `data:${mimeType};base64,${base64}`;
      } catch {
        return null;
      }
    },
  };
}
