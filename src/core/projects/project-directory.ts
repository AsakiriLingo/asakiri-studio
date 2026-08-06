export type ProjectRuntime = "browser" | "desktop";

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
  openProjectDirectory(): Promise<ProjectDirectory | null>;
}
