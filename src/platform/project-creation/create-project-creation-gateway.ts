import type { ProjectCreationGateway } from "@core/projects";
import { TauriProjectCreationGateway } from "@platform/project-creation/tauri-project-creation-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createProjectCreationGateway(
  locations: ProjectLocationRegistry,
): ProjectCreationGateway {
  return new TauriProjectCreationGateway(locations);
}
