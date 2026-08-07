export type WorkspaceArea = "content" | "media";

interface WorkspaceEmptyStateMessages {
  readonly title: string;
  readonly description: string;
}

export interface WorkspaceMessages {
  readonly navigationLabel: string;
  readonly backToProjects: string;
  readonly areas: Readonly<Record<WorkspaceArea, string>>;
  readonly emptyStates: Readonly<Record<WorkspaceArea, WorkspaceEmptyStateMessages>>;
}
