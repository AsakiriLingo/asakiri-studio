import type { Binding } from "@core/course/binding";

export const COMPOSITION_BLOCK_TYPES = ["content-card", "media", "callout"] as const;

export type CompositionBlockType = (typeof COMPOSITION_BLOCK_TYPES)[number];

export interface CompositionBlock {
  readonly id: string;
  readonly type: CompositionBlockType;
  readonly binding: Binding;
  readonly presentation?: Readonly<Record<string, unknown>>;
}

export interface Composition {
  readonly blocks: readonly CompositionBlock[];
}
