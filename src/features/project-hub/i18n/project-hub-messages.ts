import type { ProjectCreationErrorCode, ProjectDirectoryErrorCode } from "@core/projects";

export interface ProjectHubMessages {
  readonly title: string;
  readonly introduction: string;
  readonly startTitle: string;
  readonly chooseFolder: string;
  readonly openingFolder: string;
  readonly dialogTitle: string;
  readonly unsupported: string;
  readonly errors: Readonly<Record<ProjectDirectoryErrorCode, string>>;
  readonly ready: string;
  readonly create: {
    readonly title: string;
    readonly description: string;
    readonly openButton: string;
    readonly nameLabel: string;
    readonly namePlaceholder: string;
    readonly createButton: string;
    readonly cancelButton: string;
    readonly creating: string;
    readonly dialogTitle: string;
    readonly unsupported: string;
    readonly errors: Readonly<Record<ProjectCreationErrorCode, string>>;
  };
}
