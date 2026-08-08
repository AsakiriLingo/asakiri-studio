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
