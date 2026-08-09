import { invoke } from "@tauri-apps/api/core";
import type { GitStatus, ProjectSystem } from "@core/project-system";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

const UNKNOWN_GIT: GitStatus = { initialized: false, commitCount: 0, clean: true };

export function createProjectSystem(locations: ProjectLocationRegistry): ProjectSystem {
  return {
    async revealFolder(session) {
      const location = locations.get(session.id);
      if (!location) return;
      await invoke("reveal_path", { path: location.rootPath });
    },
    async readGitStatus(session) {
      const location = locations.get(session.id);
      if (!location) return UNKNOWN_GIT;
      return invoke<GitStatus>("git_status", { path: location.rootPath });
    },
  };
}
