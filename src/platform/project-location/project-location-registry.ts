export interface ProjectLocation {
  readonly rootPath: string;
}

export class ProjectLocationRegistry {
  readonly #locations = new Map<string, ProjectLocation>();

  register(projectId: string, location: ProjectLocation): void {
    this.#locations.set(projectId, location);
  }

  get(projectId: string): ProjectLocation | null {
    return this.#locations.get(projectId) ?? null;
  }
}
