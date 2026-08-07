import type { ProjectDirectoryGateway } from "@core/projects";
import { getRuntimeKind } from "@platform/runtime/runtime";
import { BrowserProjectDirectoryGateway } from "@platform/project-directory/browser-project-directory-gateway";
import { TauriProjectDirectoryGateway } from "@platform/project-directory/tauri-project-directory-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createProjectDirectoryGateway(
  locations: ProjectLocationRegistry,
): ProjectDirectoryGateway {
  return getRuntimeKind() === "tauri"
    ? new TauriProjectDirectoryGateway(locations)
    : new BrowserProjectDirectoryGateway(locations);
}
