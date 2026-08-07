import type { WindowThemeGateway } from "@core/appearance";
import type { ProjectReader } from "@core/project-reading";
import type { ProjectCreationGateway, ProjectDirectoryGateway } from "@core/projects";

export interface AppDependencies {
  readonly projectCreationGateway: ProjectCreationGateway;
  readonly projectDirectoryGateway: ProjectDirectoryGateway;
  readonly projectReader: ProjectReader;
  readonly windowThemeGateway: WindowThemeGateway;
}
