import { open } from "@tauri-apps/plugin-dialog";
import type {
  ProjectDirectory,
  ProjectDirectoryGateway,
} from "@shared/contracts/project-directory";

export class TauriProjectDirectoryGateway implements ProjectDirectoryGateway {
  readonly isSupported = true;
  readonly #paths = new Map<string, string>();

  async openProjectDirectory(): Promise<ProjectDirectory | null> {
    const path = await open({
      directory: true,
      multiple: false,
      title: "Open course project",
    });

    if (!path) {
      return null;
    }

    const pathParts = path.split(/[\\/]/).filter(Boolean);
    const name = pathParts[pathParts.length - 1] ?? path;
    const id = crypto.randomUUID();
    this.#paths.set(id, path);

    return {
      id,
      name,
      locationLabel: name,
      runtime: "desktop",
    };
  }
}
