import type { ProjectDirectoryGateway } from "@core/projects";
import { TauriProjectDirectoryGateway } from "@platform/project-directory/tauri-project-directory-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import type { RecentProjectsStore } from "@platform/project-location/recent-projects-store";

export function createProjectDirectoryGateway(
  locations: ProjectLocationRegistry,
  recents: RecentProjectsStore,
): ProjectDirectoryGateway {
  return new TauriProjectDirectoryGateway(locations, recents);
}
