import type { Binding, PortableValue } from "@core/course/binding";
import type { ContentRecord, RecordFieldItem, RecordFieldValue } from "@core/course/content";
import type { Course } from "@core/course/course";
import type { Asset } from "@core/course/media";

export type ResolvedValue =
  | { readonly kind: "text"; readonly text: string; readonly locale?: string }
  | {
      readonly kind: "asset";
      readonly asset: Asset;
      readonly label?: string;
      readonly locale?: string;
    }
  | { readonly kind: "record"; readonly record: ContentRecord }
  | { readonly kind: "list"; readonly items: readonly ResolvedValue[] }
  | { readonly kind: "literal"; readonly value: PortableValue }
  | { readonly kind: "missing"; readonly reason: string };

export interface BindingResolver {
  resolve(binding: Binding): ResolvedValue;
}

export function createBindingResolver(course: Course): BindingResolver {
  const records = new Map<string, ContentRecord>(
    course.records.map((record) => [record.id, record]),
  );
  const assets = new Map<string, Asset>(course.assets.map((asset) => [asset.id, asset]));

  function resolveAsset(
    assetId: string,
    extra: { label?: string; locale?: string } = {},
  ): ResolvedValue {
    const asset = assets.get(assetId);
    if (!asset) return { kind: "missing", reason: `asset ${assetId}` };
    return {
      kind: "asset",
      asset,
      ...(extra.label !== undefined ? { label: extra.label } : {}),
      ...(extra.locale !== undefined ? { locale: extra.locale } : {}),
    };
  }

  function resolveItem(item: RecordFieldItem): ResolvedValue {
    if (item.kind === "text") {
      return {
        kind: "text",
        text: item.value,
        ...(item.locale !== undefined ? { locale: item.locale } : {}),
      };
    }
    return resolveAsset(item.assetId, {
      ...(item.label !== undefined ? { label: item.label } : {}),
      ...(item.locale !== undefined ? { locale: item.locale } : {}),
    });
  }

  function resolveFieldValue(value: RecordFieldValue): ResolvedValue {
    if (value.kind === "text") return { kind: "text", text: value.value };
    if (value.kind === "asset") return resolveAsset(value.assetId);
    return { kind: "list", items: value.items.map(resolveItem) };
  }

  function resolveLiteral(value: PortableValue): ResolvedValue {
    if (typeof value === "string") return { kind: "text", text: value };
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Readonly<Record<string, PortableValue>>;
      if (record.type === "text" && typeof record.text === "string") {
        return { kind: "text", text: record.text };
      }
    }
    return { kind: "literal", value };
  }

  return {
    resolve(binding) {
      switch (binding.kind) {
        case "literal":
          return resolveLiteral(binding.value);
        case "asset":
          return resolveAsset(binding.assetId);
        case "record": {
          const record = records.get(binding.recordId);
          return record
            ? { kind: "record", record }
            : { kind: "missing", reason: `record ${binding.recordId}` };
        }
        case "field": {
          const record = records.get(binding.recordId);
          if (!record) return { kind: "missing", reason: `record ${binding.recordId}` };
          const field = record.fields[binding.fieldId];
          return field
            ? resolveFieldValue(field)
            : { kind: "missing", reason: `field ${binding.recordId}.${binding.fieldId}` };
        }
        case "item": {
          const record = records.get(binding.recordId);
          if (!record) return { kind: "missing", reason: `record ${binding.recordId}` };
          const field = record.fields[binding.fieldId];
          if (!field)
            return { kind: "missing", reason: `field ${binding.recordId}.${binding.fieldId}` };
          if (field.kind !== "list") {
            return {
              kind: "missing",
              reason: `field ${binding.recordId}.${binding.fieldId} is not a list`,
            };
          }
          const item = field.items.find((candidate) => candidate.id === binding.itemId);
          return item
            ? resolveItem(item)
            : {
                kind: "missing",
                reason: `item ${binding.recordId}.${binding.fieldId}.${binding.itemId}`,
              };
        }
        default:
          return { kind: "missing", reason: "unsupported binding" };
      }
    },
  };
}
