import type { Collection, ContentRecord } from "@core/course/content";
import type { Lesson } from "@core/course/lesson";
import type { Asset } from "@core/course/media";

export interface CourseProject {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly defaultLocale: string;
  readonly learningLocales: readonly string[];
}

export interface OutlineSection {
  readonly id: string;
  readonly title: string;
  readonly lessonIds: readonly string[];
}

export interface Course {
  readonly project: CourseProject;
  readonly collections: readonly Collection[];
  readonly records: readonly ContentRecord[];
  readonly assets: readonly Asset[];
  readonly lessons: readonly Lesson[];
  readonly outline: readonly OutlineSection[];
}

/**
 * Project-relative source paths for each entity, retained from parsing so that
 * edits can be written back to the exact file they came from. Part paths are
 * keyed with {@link partSourceKey}.
 */
export interface CourseSources {
  readonly project: string;
  readonly collections: Readonly<Record<string, string>>;
  readonly records: Readonly<Record<string, string>>;
  readonly assets: Readonly<Record<string, string>>;
  readonly lessons: Readonly<Record<string, string>>;
  readonly parts: Readonly<Record<string, string>>;
}

export interface LoadedCourse {
  readonly course: Course;
  readonly sources: CourseSources;
}

export function partSourceKey(lessonId: string, partId: string): string {
  return `${lessonId}::${partId}`;
}
