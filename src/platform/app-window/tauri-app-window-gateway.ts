import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AppWindowGateway } from "@core/app-window";
import type { ProjectDirectory } from "@core/projects";
import type { ProjectLocationRegistry } from "@platform/project-location";

const DEFAULT_TITLE = "Asakiri Studio";

export class TauriAppWindowGateway implements AppWindowGateway {
  constructor(private readonly locations: ProjectLocationRegistry) {}

  async focusCourseWindow(directory: ProjectDirectory): Promise<boolean> {
    const path = this.locations.get(directory.id)?.rootPath;
    if (!path) {
      return false;
    }
    try {
      return await invoke<boolean>("focus_course_window", { path });
    } catch {
      return false;
    }
  }

  async setCourseWindow(directory: ProjectDirectory | null): Promise<void> {
    const path = directory ? (this.locations.get(directory.id)?.rootPath ?? null) : null;
    await invoke("set_window_course", { path }).catch(() => undefined);
    await getCurrentWindow()
      .setTitle(directory ? directory.name : DEFAULT_TITLE)
      .catch(() => undefined);
  }
}

export function createAppWindowGateway(locations: ProjectLocationRegistry): AppWindowGateway {
  return new TauriAppWindowGateway(locations);
}
