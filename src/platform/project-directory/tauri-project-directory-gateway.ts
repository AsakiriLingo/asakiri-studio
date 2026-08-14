import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ProjectDirectory, ProjectDirectoryGateway, RecentProject } from "@core/projects";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import type { RecentProjectsStore } from "@platform/project-location/recent-projects-store";

export class TauriProjectDirectoryGateway implements ProjectDirectoryGateway {
  constructor(
    private readonly locations: ProjectLocationRegistry,
    private readonly recents: RecentProjectsStore,
  ) {}

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
    this.recents.remember({ id, name: title, locationLabel: directoryName, rootPath: path });

    return {
      id,
      name: title,
      locationLabel: directoryName,
    };
  }

  listRecentProjects(): readonly RecentProject[] {
    return this.recents.list().map((entry) => ({
      id: entry.id,
      name: entry.name,
      locationLabel: entry.locationLabel,
    }));
  }

  async openRecentProject(id: string): Promise<ProjectDirectory | null> {
    const entry = this.recents.get(id);
    if (!entry) {
      return null;
    }
    const title = await invoke<string>("read_course_title", { path: entry.rootPath }).catch(
      () => entry.name,
    );
    this.locations.register(entry.id, { rootPath: entry.rootPath });
    this.recents.remember({ ...entry, name: title });

    return {
      id: entry.id,
      name: title,
      locationLabel: entry.locationLabel,
    };
  }
}
