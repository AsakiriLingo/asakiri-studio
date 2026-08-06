import type { ProjectDirectoryGateway } from "@shared/contracts/project-directory";

export interface AppDependencies {
  readonly projectDirectoryGateway: ProjectDirectoryGateway;
}
