import type { AppDependencies } from "@app/providers/app-dependencies";
import { createProjectCreationGateway } from "@platform/project-creation";
import { createProjectDirectoryGateway } from "@platform/project-directory";
import { ProjectLocationRegistry } from "@platform/project-location";
import { createProjectReader } from "@platform/project-reading";
import { createWindowThemeGateway } from "@platform/window-theme";

export function createAppDependencies(): AppDependencies {
  const projectLocations = new ProjectLocationRegistry();

  return {
    projectCreationGateway: createProjectCreationGateway(projectLocations),
    projectDirectoryGateway: createProjectDirectoryGateway(projectLocations),
    projectReader: createProjectReader(projectLocations),
    windowThemeGateway: createWindowThemeGateway(),
  };
}
