import type { ProjectDirectoryErrorCode } from "@core/projects";

export interface ProjectHubMessages {
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly openProjectTitle: string;
  readonly openProjectDescription: string;
  readonly chooseFolder: string;
  readonly openingFolder: string;
  readonly dialogTitle: string;
  readonly unsupported: string;
  readonly errors: Readonly<Record<ProjectDirectoryErrorCode, string>>;
  readonly ready: string;
}
