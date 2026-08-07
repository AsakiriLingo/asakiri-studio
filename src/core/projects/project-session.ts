import type { ProjectDirectory } from "@core/projects/project-directory";

export interface ProjectSession {
  readonly id: string;
  readonly name: string;
}

export function createProjectSession(directory: ProjectDirectory): ProjectSession {
  return {
    id: directory.id,
    name: directory.name,
  };
}
