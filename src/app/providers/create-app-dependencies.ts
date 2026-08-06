import type { AppDependencies } from "@app/providers/app-dependencies";
import { createProjectDirectoryGateway } from "@platform/project-directory";

export function createAppDependencies(): AppDependencies {
  return {
    projectDirectoryGateway: createProjectDirectoryGateway(),
  };
}
