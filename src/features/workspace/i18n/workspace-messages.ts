import type { LessonType } from "@core/course";
import type { ProjectValidationReason } from "@features/workspace/model/workspace-open-state";

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
  readonly outline: {
    readonly empty: string;
    readonly lessonTypes: Readonly<Record<LessonType, string>>;
  };
  readonly openStates: {
    readonly validating: string;
    readonly invalidTitle: string;
    readonly invalidReasons: Readonly<Record<ProjectValidationReason, string>>;
  };
}
