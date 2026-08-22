import type { TiptapDocument } from "@core/course";

export interface Draft {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly document: TiptapDocument;
}

export interface DraftSources {
  readonly manifest: string;
  readonly bodies: Readonly<Record<string, string>>;
}

export interface LoadedDrafts {
  readonly drafts: readonly Draft[];
  readonly sources: DraftSources;
}
