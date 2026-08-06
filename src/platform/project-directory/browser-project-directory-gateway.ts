import type { ProjectDirectory, ProjectDirectoryGateway } from "@core/projects";
import { ProjectDirectoryError } from "@core/projects";

export class BrowserProjectDirectoryGateway implements ProjectDirectoryGateway {
  readonly isSupported = "showDirectoryPicker" in window;
  readonly runtime = "browser" as const;
  readonly #handles = new Map<string, FileSystemDirectoryHandle>();

  async openProjectDirectory(_options: {
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null> {
    if (!this.isSupported) {
      throw new ProjectDirectoryError("unsupported");
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const id = crypto.randomUUID();
      this.#handles.set(id, handle);

      return {
        id,
        name: handle.name,
        locationLabel: handle.name,
        runtime: "browser",
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw new ProjectDirectoryError("permissionDenied");
      }

      throw new ProjectDirectoryError("unknown");
    }
  }
}
