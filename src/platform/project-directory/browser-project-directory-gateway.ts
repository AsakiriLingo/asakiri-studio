import type { ProjectDirectory, ProjectDirectoryGateway } from "@core/projects";
import { ProjectDirectoryError } from "@core/projects";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";
import { parseProjectManifestTitle } from "@platform/project-directory/project-manifest-title";

async function readProjectTitle(handle: FileSystemDirectoryHandle): Promise<string | null> {
  const fileHandle = await handle.getFileHandle("project.json");
  const file = await fileHandle.getFile();
  return parseProjectManifestTitle(await file.text());
}

export class BrowserProjectDirectoryGateway implements ProjectDirectoryGateway {
  readonly isSupported = "showDirectoryPicker" in window;
  readonly runtime = "browser" as const;

  constructor(private readonly locations: ProjectLocationRegistry) {}

  async openProjectDirectory(_options: {
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null> {
    if (!this.isSupported) {
      throw new ProjectDirectoryError("unsupported");
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const id = crypto.randomUUID();
      this.locations.register(id, { runtime: "browser", handle });
      const title = await readProjectTitle(handle).catch(() => null);

      return {
        id,
        name: title ?? handle.name,
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
