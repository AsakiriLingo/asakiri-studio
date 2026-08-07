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
  readonly isSupported: boolean;
  listContentCollections(
    session: ProjectSession,
  ): Promise<ProjectReadResult<readonly ContentCollectionSummary[]>>;
}
