import type {
  Asset,
  Collection,
  ContentRecord,
  CourseProject,
  Exercise,
  Lesson,
  OutlineSection,
  TiptapDocument,
} from "@core/course";
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
  updateOutline(
    session: ProjectSession,
    outline: readonly OutlineSection[],
  ): Promise<ProjectWriteResult>;
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
  updatePartExercise(
    session: ProjectSession,
    path: string,
    exercise: Exercise,
  ): Promise<ProjectWriteResult>;
  updatePartContentTitle(
    session: ProjectSession,
    lessonPath: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult>;
  updatePartTitle(
    session: ProjectSession,
    lessonPath: string,
    partId: string,
    title: string,
  ): Promise<ProjectWriteResult>;
  deletePart(
    session: ProjectSession,
    lessonPath: string,
    partId: string,
    bodyPath: string,
  ): Promise<ProjectWriteResult>;
  createPart(
    session: ProjectSession,
    lessonPath: string,
    bodyPath: string,
    part: { readonly id: string; readonly title: string },
    document: TiptapDocument,
  ): Promise<ProjectWriteResult>;
  createExercisePart(
    session: ProjectSession,
    lessonPath: string,
    bodyPath: string,
    part: { readonly id: string; readonly title: string },
    exercise: Exercise,
  ): Promise<ProjectWriteResult>;
  reorderParts(
    session: ProjectSession,
    lessonPath: string,
    orderedPartIds: readonly string[],
  ): Promise<ProjectWriteResult>;
  createLesson(
    session: ProjectSession,
    lessonPath: string,
    lesson: Lesson,
    outline: readonly OutlineSection[],
  ): Promise<ProjectWriteResult>;
  updateLesson(
    session: ProjectSession,
    lessonPath: string,
    lesson: Lesson,
  ): Promise<ProjectWriteResult>;
  deleteLesson(
    session: ProjectSession,
    lessonPath: string,
    outline: readonly OutlineSection[],
  ): Promise<ProjectWriteResult>;
  /** Writes a new record file and links it into its collection's recordFiles. */
  createRecord(
    session: ProjectSession,
    collectionPath: string,
    recordPath: string,
    record: ContentRecord,
  ): Promise<ProjectWriteResult>;
  createRecords(
    session: ProjectSession,
    collectionPath: string,
    entries: readonly { readonly path: string; readonly record: ContentRecord }[],
  ): Promise<ProjectWriteResult>;
  /** Removes a record from its collection's recordFiles and deletes the file. */
  deleteRecord(
    session: ProjectSession,
    collectionPath: string,
    recordPath: string,
  ): Promise<ProjectWriteResult>;
  /** Writes a new collection file and links it into project.json collections. */
  createCollection(
    session: ProjectSession,
    collectionPath: string,
    collection: Collection,
  ): Promise<ProjectWriteResult>;
  /** Unlinks a collection from project.json and deletes it and its records. */
  deleteCollection(
    session: ProjectSession,
    collectionPath: string,
    recordPaths: readonly string[],
  ): Promise<ProjectWriteResult>;
  /** Rewrites a collection's name, description, and fields, keeping its records. */
  updateCollection(
    session: ProjectSession,
    collectionPath: string,
    collection: Collection,
  ): Promise<ProjectWriteResult>;
  /**
   * Copies a picked media file into the project, writes its `asset.json`
   * descriptor, and links it into project.json assets. `binaryPath` and
   * `assetPath` are project-relative; `sourcePath` is the absolute file to copy.
   */
  importAsset(
    session: ProjectSession,
    assetPath: string,
    binaryPath: string,
    sourcePath: string,
    asset: Asset,
  ): Promise<ProjectWriteResult>;
  /** Unlinks an asset from project.json and removes its media/assets folder. */
  deleteAsset(session: ProjectSession, assetPath: string): Promise<ProjectWriteResult>;
  writeAttribution(session: ProjectSession, markdown: string): Promise<ProjectWriteResult>;
  renameAsset(
    session: ProjectSession,
    assetPath: string,
    oldFile: string | null,
    asset: Asset,
  ): Promise<ProjectWriteResult>;
}
