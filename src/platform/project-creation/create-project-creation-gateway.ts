import type { ProjectCreationGateway } from "@core/projects";
import { TauriProjectCreationGateway } from "@platform/project-creation/tauri-project-creation-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import type { RecentProjectsStore } from "@platform/project-location/recent-projects-store";

export function createProjectCreationGateway(
  locations: ProjectLocationRegistry,
  recents: RecentProjectsStore,
): ProjectCreationGateway {
  return new TauriProjectCreationGateway(locations, recents);
}
