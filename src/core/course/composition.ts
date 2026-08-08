import type { Binding } from "@core/course/binding";

export type CompositionBlockType = "content-card" | "media" | "callout";

export interface CompositionBlock {
  readonly id: string;
  readonly type: CompositionBlockType;
  readonly binding: Binding;
  readonly presentation?: Readonly<Record<string, unknown>>;
}

export interface Composition {
  readonly blocks: readonly CompositionBlock[];
}
