export interface FileEntryHandleLike {
  getFile(): Promise<{ text(): Promise<string> }>;
}

export interface DirectoryHandleLike {
  getDirectoryHandle(name: string): Promise<DirectoryHandleLike>;
  getFileHandle(name: string): Promise<FileEntryHandleLike>;
}

export type ProjectLocation =
  | { readonly runtime: "browser"; readonly handle: DirectoryHandleLike }
  | { readonly runtime: "tauri"; readonly rootPath: string };

export class ProjectLocationRegistry {
  readonly #locations = new Map<string, ProjectLocation>();

  register(projectId: string, location: ProjectLocation): void {
    this.#locations.set(projectId, location);
  }

  get(projectId: string): ProjectLocation | null {
    return this.#locations.get(projectId) ?? null;
  }
}
