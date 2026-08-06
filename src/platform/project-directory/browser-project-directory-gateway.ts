import type {
  ProjectDirectory,
  ProjectDirectoryGateway,
} from "@core/projects";

export class BrowserProjectDirectoryGateway implements ProjectDirectoryGateway {
  readonly isSupported = "showDirectoryPicker" in window;
  readonly #handles = new Map<string, FileSystemDirectoryHandle>();

  async openProjectDirectory(): Promise<ProjectDirectory | null> {
    if (!this.isSupported) {
      throw new Error(
        "This Chromium version does not support local directory access.",
      );
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

      throw error;
    }
  }
}
