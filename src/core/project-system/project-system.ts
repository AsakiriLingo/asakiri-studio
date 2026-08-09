import type { ProjectSession } from "@core/projects";

export interface GitStatus {
  readonly initialized: boolean;
  readonly commitCount: number;
  readonly clean: boolean;
}

/**
 * Operating-system integrations for a project folder that are not part of its
 * data: revealing it in the file manager and reading its Git status.
 */
export interface ProjectSystem {
  revealFolder(session: ProjectSession): Promise<void>;
  readGitStatus(session: ProjectSession): Promise<GitStatus>;
}
