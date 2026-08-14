export type ProjectDirectoryErrorCode = "permissionDenied" | "unknown";

export class ProjectDirectoryError extends Error {
  readonly code: ProjectDirectoryErrorCode;

  constructor(code: ProjectDirectoryErrorCode) {
    super(code);
    this.name = "ProjectDirectoryError";
    this.code = code;
  }
}

export interface ProjectDirectory {
  readonly id: string;
  readonly name: string;
  readonly locationLabel: string;
}

export interface RecentProject {
  readonly id: string;
  readonly name: string;
  readonly locationLabel: string;
}

/**
 * Product-facing port for selecting a course project. Platform-specific
 * paths remain private to concrete adapters.
 */
export interface ProjectDirectoryGateway {
  openProjectDirectory(options: { readonly dialogTitle: string }): Promise<ProjectDirectory | null>;
  listRecentProjects(): readonly RecentProject[];
  openRecentProject(id: string): Promise<ProjectDirectory | null>;
}
