import type { Composition } from "@core/course/composition";
import type { TiptapDocument } from "@core/course/document";
import type { Exercise } from "@core/course/exercise";

export type LessonType = "rich-text" | "rich-media" | "exercise";

export type LessonContent =
  | { readonly kind: "tiptap"; readonly document: TiptapDocument }
  | { readonly kind: "composition"; readonly composition: Composition }
  | { readonly kind: "exercise"; readonly exercise: Exercise };

export interface Lesson {
  readonly id: string;
  readonly type: LessonType;
  readonly title: string;
  readonly content: LessonContent;
}
