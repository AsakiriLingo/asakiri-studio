import type { AssetKind } from "@core/course/media";

export type FieldKind = "text" | "asset";

export type FieldCardinality = "one" | "many";

export interface FieldDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: FieldKind;
  readonly cardinality: FieldCardinality;
  readonly required: boolean;
  readonly locale?: string;
  readonly assetKind?: AssetKind;
}

export interface Collection {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly fields: readonly FieldDefinition[];
}

export type RecordFieldItem =
  | {
      readonly id: string;
      readonly kind: "text";
      readonly value: string;
      readonly label?: string;
      readonly locale?: string;
    }
  | {
      readonly id: string;
      readonly kind: "asset";
      readonly assetId: string;
      readonly label?: string;
      readonly locale?: string;
    };

export type RecordFieldValue =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "asset"; readonly assetId: string }
  | { readonly kind: "list"; readonly items: readonly RecordFieldItem[] };

export interface RecordColumn {
  readonly fieldId: string;
  readonly visible: boolean;
}

export interface RecordPresentation {
  readonly id: string;
  readonly primaryFieldId: string;
  readonly columns: readonly RecordColumn[];
}

export interface ContentRecord {
  readonly id: string;
  readonly collectionId: string;
  readonly fields: Readonly<Record<string, RecordFieldValue>>;
  readonly presentations?: readonly RecordPresentation[];
}
