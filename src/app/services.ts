import type { ProjectCreationGateway, ProjectDirectoryGateway } from "@core/projects";
import type { ProjectReader } from "@core/project-reading";
import { createProjectCreationGateway } from "@platform/project-creation";
import { createProjectDirectoryGateway } from "@platform/project-directory";
import { ProjectLocationRegistry } from "@platform/project-location";
import { createProjectReader } from "@platform/project-reading";

export interface AppServices {
  readonly creation: ProjectCreationGateway;
  readonly directory: ProjectDirectoryGateway;
  readonly reader: ProjectReader;
}

/**
 * Composition root. One registry backs every gateway so that a project
 * registered while creating or opening it is later resolvable by the reader.
 */
export function createAppServices(): AppServices {
  const locations = new ProjectLocationRegistry();
  return {
    creation: createProjectCreationGateway(locations),
    directory: createProjectDirectoryGateway(locations),
    reader: createProjectReader(locations),
  };
}
