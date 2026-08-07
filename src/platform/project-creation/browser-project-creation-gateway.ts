import type { ProjectCreationGateway, ProjectDirectory } from "@core/projects";
import { ProjectCreationError } from "@core/projects";

export class BrowserProjectCreationGateway implements ProjectCreationGateway {
  readonly isSupported = false;
  readonly runtime = "browser" as const;

  createCourse(): Promise<ProjectDirectory | null> {
    return Promise.reject(new ProjectCreationError("unsupported"));
  }
}
