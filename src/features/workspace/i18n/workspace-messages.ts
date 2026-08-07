export type WorkspaceArea = "content" | "media" | "lessons";

interface WorkspaceEmptyStateMessages {
  readonly title: string;
  readonly description: string;
}

export interface WorkspaceMessages {
  readonly navigationLabel: string;
  readonly backToProjects: string;
  readonly areas: Readonly<Record<WorkspaceArea, string>>;
  readonly emptyStates: Readonly<Record<WorkspaceArea, WorkspaceEmptyStateMessages>>;
  readonly contentActions: {
    readonly createContent: string;
  };
  readonly mediaActions: {
    readonly importMedia: string;
  };
}
