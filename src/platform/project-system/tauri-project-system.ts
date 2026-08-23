import { invoke } from "@tauri-apps/api/core";
import type { ProjectSystem } from "@core/project-system";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createProjectSystem(locations: ProjectLocationRegistry): ProjectSystem {
  return {
    async revealFolder(session) {
      const location = locations.get(session.id);
      if (!location) return;
      await invoke("reveal_path", { path: location.rootPath });
    },
  };
}
