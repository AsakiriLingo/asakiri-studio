export type EditorAssetKind = "audio" | "image" | "video";

export interface EditorAsset {
  readonly id: string;
  readonly kind: EditorAssetKind;
  readonly label: string;
  readonly file: string | null;
}

export interface EditorField {
  readonly id: string;
  readonly name: string;
}

export interface EditorCollection {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly EditorField[];
}

export interface EditorColumn {
  readonly fieldId: string;
  readonly visible: boolean;
}

export interface EditorPresentation {
  readonly id: string;
  readonly primaryFieldId: string;
  readonly columns: readonly EditorColumn[];
}

export interface EditorFieldAsset {
  readonly assetId: string;
  readonly kind: EditorAssetKind;
  readonly label: string;
}

export interface EditorRecord {
  readonly id: string;
  readonly collectionId: string;
  readonly label: string;
  readonly fieldText: Readonly<Record<string, string>>;
  readonly fieldAssets: Readonly<Record<string, readonly EditorFieldAsset[]>>;
  readonly presentations: readonly EditorPresentation[];
}

export interface RichEditorLibrary {
  readonly assets: readonly EditorAsset[];
  readonly collections: readonly EditorCollection[];
  readonly records: readonly EditorRecord[];
}

export const EMPTY_LIBRARY: RichEditorLibrary = {
  assets: [],
  collections: [],
  records: [],
};

export type SaveRecordPresentation = (
  recordId: string,
  presentation: EditorPresentation,
) => void | Promise<void>;

export type LoadAssetPreview = (assetId: string) => Promise<string | null>;

export type ImportMedia = () => Promise<EditorAsset | null>;
