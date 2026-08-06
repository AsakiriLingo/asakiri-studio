export type ProjectRuntime = "browser" | "desktop";
export type ProjectDirectoryErrorCode =
  | "permissionDenied"
  | "unknown"
  | "unsupported";

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
  readonly runtime: ProjectRuntime;
}

/**
 * Product-facing port for selecting a course project. Platform-specific
 * handles and absolute paths remain private to concrete adapters.
 */
export interface ProjectDirectoryGateway {
  readonly isSupported: boolean;
  readonly runtime: ProjectRuntime;
  openProjectDirectory(options: {
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null>;
}
