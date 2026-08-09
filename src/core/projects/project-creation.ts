import type { ProjectDirectory } from "@core/projects/project-directory";

export type ProjectCreationErrorCode =
  "alreadyExists" | "invalidName" | "permissionDenied" | "unknown";

export class ProjectCreationError extends Error {
  readonly code: ProjectCreationErrorCode;

  constructor(code: ProjectCreationErrorCode) {
    super(code);
    this.name = "ProjectCreationError";
    this.code = code;
  }
}

export interface ProjectCreationGateway {
  createCourse(request: {
    readonly name: string;
    readonly dialogTitle: string;
  }): Promise<ProjectDirectory | null>;
}
