import type { ProjectHubMessages } from "@features/project-hub";
import type { WorkspaceMessages } from "@features/workspace";
import type { ThemeToggleMessages } from "@app/theme/theme-toggle-messages";

export interface AppMessages {
  readonly projectHub: ProjectHubMessages;
  readonly themeToggle: ThemeToggleMessages;
  readonly workspace: WorkspaceMessages;
}
