import type { LoadedCourse } from "@core/course";
import type { LoadedDrafts } from "@core/drafts";
import type { ProjectSession } from "@core/projects";

export interface ContentCollectionSummary {
  readonly id: string;
  readonly name: string;
  readonly recordCount: number;
}

export type ProjectReadErrorCode = "unavailable" | "unknown";

export type ProjectReadResult<T> =
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "failed"; readonly code: ProjectReadErrorCode };

export interface ProjectReader {
  listContentCollections(
    session: ProjectSession,
  ): Promise<ProjectReadResult<readonly ContentCollectionSummary[]>>;
  readCourse(session: ProjectSession): Promise<ProjectReadResult<LoadedCourse>>;
  readDrafts(session: ProjectSession): Promise<ProjectReadResult<LoadedDrafts>>;
}
