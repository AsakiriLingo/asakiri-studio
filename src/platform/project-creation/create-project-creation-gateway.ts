import type { ProjectCreationGateway } from "@core/projects";
import { BrowserProjectCreationGateway } from "@platform/project-creation/browser-project-creation-gateway";
import { TauriProjectCreationGateway } from "@platform/project-creation/tauri-project-creation-gateway";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { getRuntimeKind } from "@platform/runtime/runtime";

export function createProjectCreationGateway(
  locations: ProjectLocationRegistry,
): ProjectCreationGateway {
  return getRuntimeKind() === "tauri"
    ? new TauriProjectCreationGateway(locations)
    : new BrowserProjectCreationGateway();
}
