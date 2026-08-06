import type { AppDependencies } from "@app/providers/app-dependencies";
import { createProjectDirectoryGateway } from "@platform/project-directory";
import { createWindowThemeGateway } from "@platform/window-theme";

export function createAppDependencies(): AppDependencies {
  return {
    projectDirectoryGateway: createProjectDirectoryGateway(),
    windowThemeGateway: createWindowThemeGateway(),
  };
}
