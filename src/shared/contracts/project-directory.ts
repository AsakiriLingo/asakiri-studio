export type ProjectRuntime = "browser" | "desktop";

export interface ProjectDirectory {
  readonly id: string;
  readonly name: string;
  readonly locationLabel: string;
  readonly runtime: ProjectRuntime;
}

/**
 * A feature-facing port. Platform-specific directory handles stay inside its
 * adapters and never leak into React components or course domain models.
 */
export interface ProjectDirectoryGateway {
  readonly isSupported: boolean;
  openProjectDirectory(): Promise<ProjectDirectory | null>;
}
