import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectDirectory, ProjectDirectoryGateway } from "@core/projects";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export class TauriProjectDirectoryGateway implements ProjectDirectoryGateway {
  constructor(private readonly locations: ProjectLocationRegistry) {}

  async openProjectDirectory(options: {
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null> {
    const path = await open({
      directory: true,
      multiple: false,
      recursive: true,
      title: options.dialogTitle,
    });

    if (!path) {
      return null;
    }

    const pathParts = path.split(/[\\/]/).filter(Boolean);
    const directoryName = pathParts[pathParts.length - 1] ?? path;
    const title = await invoke<string>("read_course_title", { path }).catch(() => directoryName);
    const id = crypto.randomUUID();
    this.locations.register(id, { rootPath: path });

    return {
      id,
      name: title,
      locationLabel: directoryName,
    };
  }
}
