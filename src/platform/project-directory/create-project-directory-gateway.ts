import type { ProjectDirectoryGateway } from "@core/projects";
import { getRuntimeKind } from "@platform/runtime/runtime";
import { BrowserProjectDirectoryGateway } from "@platform/project-directory/browser-project-directory-gateway";
import { TauriProjectDirectoryGateway } from "@platform/project-directory/tauri-project-directory-gateway";

export function createProjectDirectoryGateway(): ProjectDirectoryGateway {
  return getRuntimeKind() === "tauri"
    ? new TauriProjectDirectoryGateway()
    : new BrowserProjectDirectoryGateway();
}
