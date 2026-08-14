import type { Composition } from "@core/course/composition";
import type { TiptapDocument } from "@core/course/document";
import type { Exercise } from "@core/course/exercise";

export type PartContent =
  | { readonly kind: "tiptap"; readonly title?: string; readonly document: TiptapDocument }
  | { readonly kind: "composition"; readonly composition: Composition }
  | { readonly kind: "exercise"; readonly exercise: Exercise };

export interface Part {
  readonly id: string;
  readonly title: string;
  readonly content: PartContent;
}

export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly parts: readonly Part[];
}
