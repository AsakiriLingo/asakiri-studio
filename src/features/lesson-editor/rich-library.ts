import type { Asset, Collection, ContentRecord, Course, RecordFieldValue } from "@core/course";
import type {
  EditorAsset,
  EditorFieldAsset,
  EditorRecord,
  RichEditorLibrary,
} from "@shared/components/rich-editor";

function assetLabel(assetId: string, assets: ReadonlyMap<string, Asset>): string {
  return assets.get(assetId)?.label ?? assetId;
}

function fieldText(value: RecordFieldValue, assets: ReadonlyMap<string, Asset>): string {
  if (value.kind === "text") return value.value;
  if (value.kind === "asset") return assetLabel(value.assetId, assets);
  return value.items
    .map((item) => (item.kind === "text" ? item.value : assetLabel(item.assetId, assets)))
    .join(", ");
}

function toFieldAsset(
  assetId: string,
  assets: ReadonlyMap<string, Asset>,
): EditorFieldAsset | null {
  const asset = assets.get(assetId);
  if (!asset) return null;
  return { assetId, kind: asset.kind, label: asset.label };
}

function fieldAssets(
  value: RecordFieldValue,
  assets: ReadonlyMap<string, Asset>,
): EditorFieldAsset[] {
  if (value.kind === "text") return [];
  if (value.kind === "asset") {
    const asset = toFieldAsset(value.assetId, assets);
    return asset ? [asset] : [];
  }
  return value.items
    .filter((item) => item.kind === "asset")
    .map((item) => toFieldAsset(item.assetId, assets))
    .filter((asset): asset is EditorFieldAsset => asset !== null);
}

function recordLabel(
  record: ContentRecord,
  collection: Collection | undefined,
  text: Record<string, string>,
): string {
  for (const field of collection?.fields ?? []) {
    const value = text[field.id];
    if (value) return value;
  }
  const first = Object.values(text).find(Boolean);
  return first ?? record.id;
}

function toEditorRecord(
  record: ContentRecord,
  collections: ReadonlyMap<string, Collection>,
  assets: ReadonlyMap<string, Asset>,
): EditorRecord {
  const text: Record<string, string> = {};
  const media: Record<string, readonly EditorFieldAsset[]> = {};
  for (const [fieldId, value] of Object.entries(record.fields)) {
    text[fieldId] = fieldText(value, assets);
    media[fieldId] = fieldAssets(value, assets);
  }
  const collection = collections.get(record.collectionId);
  return {
    id: record.id,
    collectionId: record.collectionId,
    label: recordLabel(record, collection, text),
    fieldText: text,
    fieldAssets: media,
    presentations: (record.presentations ?? []).map((p) => ({
      id: p.id,
      primaryFieldId: p.primaryFieldId,
      columns: p.columns.map((c) => ({ fieldId: c.fieldId, visible: c.visible })),
    })),
  };
}

function toEditorAsset(asset: Asset): EditorAsset {
  return { id: asset.id, kind: asset.kind, label: asset.label, file: asset.file };
}

export function courseToRichLibrary(course: Course): RichEditorLibrary {
  const collections = new Map(course.collections.map((c) => [c.id, c]));
  const assets = new Map(course.assets.map((a) => [a.id, a]));
  return {
    assets: course.assets.map(toEditorAsset),
    collections: course.collections.map((c) => ({
      id: c.id,
      name: c.name,
      fields: c.fields.map((f) => ({ id: f.id, name: f.name })),
    })),
    records: course.records.map((r) => toEditorRecord(r, collections, assets)),
  };
}
