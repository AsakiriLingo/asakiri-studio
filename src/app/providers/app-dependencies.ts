import type { WindowThemeGateway } from "@core/appearance";
import type { ProjectDirectoryGateway } from "@core/projects";

export interface AppDependencies {
  readonly projectDirectoryGateway: ProjectDirectoryGateway;
  readonly windowThemeGateway: WindowThemeGateway;
}
