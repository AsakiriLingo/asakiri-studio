import type { ProjectDirectoryGateway } from "@core/projects";
import { TauriProjectDirectoryGateway } from "@platform/project-directory/tauri-project-directory-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createProjectDirectoryGateway(
  locations: ProjectLocationRegistry,
): ProjectDirectoryGateway {
  return new TauriProjectDirectoryGateway(locations);
}
