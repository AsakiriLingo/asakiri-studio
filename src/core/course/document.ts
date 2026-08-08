export interface TiptapMark {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

export interface TiptapNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly TiptapNode[];
  readonly marks?: readonly TiptapMark[];
  readonly text?: string;
}

export interface TiptapDocument extends TiptapNode {
  readonly type: "doc";
}
