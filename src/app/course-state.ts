import type { Course, CourseSources } from "@core/course";
import type { ProjectReadErrorCode } from "@core/project-reading";
import type { ProjectWriteResult } from "@core/project-writing";
import type { ProjectSession } from "@core/projects";

export type CourseState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly course: Course; readonly sources: CourseSources }
  | { readonly status: "failed"; readonly code: ProjectReadErrorCode };

export type ReadyCourseState = Extract<CourseState, { readonly status: "ready" }>;

export interface CourseWriteContext {
  readonly session: ProjectSession;
  readonly course: Course;
  readonly sources: CourseSources;
  readonly apply: (updater: (current: ReadyCourseState) => ReadyCourseState) => void;
}

export const WRITE_UNAVAILABLE: ProjectWriteResult = { status: "failed", code: "unavailable" };
