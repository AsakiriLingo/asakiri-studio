import type { ContentRecord, CourseProject, TiptapDocument } from "@core/course";
import type { ProjectSession } from "@core/projects";

export type ProjectWriteErrorCode = "unavailable" | "unknown";

export type ProjectWriteResult =
  | { readonly status: "saved" }
  | { readonly status: "failed"; readonly code: ProjectWriteErrorCode };

/**
 * Writes changes back to the project folder. Implementations read the target
 * file and merge the change, so on-disk keys and file layout are preserved.
 */
export interface ProjectWriter {
  updateProject(session: ProjectSession, project: CourseProject): Promise<ProjectWriteResult>;
  /**
   * Writes a content record back to its source file. `path` is the
   * project-relative path retained from parsing (see CourseSources).
   */
  updateRecord(
    session: ProjectSession,
    path: string,
    record: ContentRecord,
  ): Promise<ProjectWriteResult>;
  /**
   * Writes a rich-text (tiptap) part's document back to its body file. `path`
   * is the project-relative part path retained from parsing. The body file is
   * the document itself, so it is fully replaced.
   */
  updatePartDocument(
    session: ProjectSession,
    path: string,
    document: TiptapDocument,
  ): Promise<ProjectWriteResult>;
}
