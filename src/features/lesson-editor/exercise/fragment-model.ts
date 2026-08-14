import type { Binding, RenderFragment } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";

export type FragmentSource = "text" | "content" | "asset";

export const WHOLE_RECORD = "__whole__";

export function newFragmentId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function fragmentSource(binding: Binding): FragmentSource {
  switch (binding.kind) {
    case "asset":
      return "asset";
    case "field":
    case "record":
    case "item":
      return "content";
    case "literal":
      return "text";
  }
}

export function literalText(binding: Binding): string {
  if (binding.kind !== "literal") return "";
  const value = binding.value;
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Readonly<Record<string, unknown>>;
    if (record.type === "text" && typeof record.text === "string") return record.text;
  }
  return "";
}

export function textBinding(text: string): Binding {
  return { kind: "literal", value: { type: "text", text } };
}

export function fieldBinding(recordId: string, fieldId: string): Binding {
  return { kind: "field", recordId, fieldId };
}

export function recordBinding(recordId: string): Binding {
  return { kind: "record", recordId };
}

export function assetBinding(assetId: string): Binding {
  return { kind: "asset", assetId };
}

export function withBinding(
  fragment: RenderFragment | undefined,
  role: string,
  binding: Binding,
): RenderFragment {
  return { id: fragment?.id ?? newFragmentId("frag"), role, binding };
}

export function textFragment(role: string, text = ""): RenderFragment {
  return { id: newFragmentId("frag"), role, binding: textBinding(text) };
}

export function fragmentLabel(
  fragment: RenderFragment | undefined,
  library: RichEditorLibrary,
): string {
  if (!fragment) return "";
  const binding = fragment.binding;
  switch (binding.kind) {
    case "literal":
      return literalText(binding);
    case "record":
      return (
        library.records.find((entry) => entry.id === binding.recordId)?.label ?? binding.recordId
      );
    case "field":
      return (
        library.records.find((entry) => entry.id === binding.recordId)?.fieldText[
          binding.fieldId
        ] ?? binding.fieldId
      );
    case "asset":
      return library.assets.find((entry) => entry.id === binding.assetId)?.label ?? binding.assetId;
    case "item":
      return binding.itemId;
  }
}
