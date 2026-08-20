import { describe, expect, it } from "vitest";
import type { Binding, RenderFragment } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import {
  WHOLE_RECORD,
  assetBinding,
  fieldBinding,
  fragmentLabel,
  fragmentSource,
  literalText,
  newFragmentId,
  recordBinding,
  textBinding,
  textFragment,
  withBinding,
} from "@features/lesson-editor/exercise/fragment-model";

function library(overrides: Partial<RichEditorLibrary> = {}): RichEditorLibrary {
  return {
    assets: [],
    collections: [],
    records: [],
    ...overrides,
  };
}

describe("newFragmentId", () => {
  it("prefixes the id and stays unique", () => {
    const a = newFragmentId("frag");
    const b = newFragmentId("frag");
    expect(a.startsWith("frag_")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("fragmentSource", () => {
  it("maps each binding kind to its source", () => {
    expect(fragmentSource({ kind: "asset", assetId: "a" })).toBe("asset");
    expect(fragmentSource({ kind: "field", recordId: "r", fieldId: "f" })).toBe("content");
    expect(fragmentSource({ kind: "record", recordId: "r" })).toBe("content");
    expect(fragmentSource({ kind: "item", recordId: "r", fieldId: "f", itemId: "i" })).toBe(
      "content",
    );
    expect(fragmentSource({ kind: "literal", value: "x" })).toBe("text");
  });
});

describe("literalText", () => {
  it("returns a plain string literal", () => {
    expect(literalText({ kind: "literal", value: "hello" })).toBe("hello");
  });

  it("reads text from a rich text value object", () => {
    expect(literalText({ kind: "literal", value: { type: "text", text: "rich" } })).toBe("rich");
  });

  it("returns empty string for non-literal bindings", () => {
    expect(literalText({ kind: "record", recordId: "r" })).toBe("");
  });

  it("returns empty string for unrecognized literal shapes", () => {
    expect(literalText({ kind: "literal", value: 42 })).toBe("");
    expect(literalText({ kind: "literal", value: null })).toBe("");
    expect(literalText({ kind: "literal", value: ["a"] })).toBe("");
    expect(literalText({ kind: "literal", value: { type: "other" } })).toBe("");
  });
});

describe("binding factories", () => {
  it("builds each binding shape", () => {
    expect(textBinding("hi")).toEqual({ kind: "literal", value: { type: "text", text: "hi" } });
    expect(fieldBinding("r1", "f1")).toEqual({ kind: "field", recordId: "r1", fieldId: "f1" });
    expect(recordBinding("r1")).toEqual({ kind: "record", recordId: "r1" });
    expect(assetBinding("a1")).toEqual({ kind: "asset", assetId: "a1" });
  });
});

describe("withBinding", () => {
  it("keeps the existing fragment id when updating", () => {
    const existing: RenderFragment = {
      id: "frag_keep",
      role: "prompt",
      binding: textBinding("old"),
    };
    const next = withBinding(existing, "answer", recordBinding("r1"));
    expect(next.id).toBe("frag_keep");
    expect(next.role).toBe("answer");
    expect(next.binding).toEqual(recordBinding("r1"));
  });

  it("generates a new id when no fragment is given", () => {
    const next = withBinding(undefined, "prompt", assetBinding("a1"));
    expect(next.id.startsWith("frag_")).toBe(true);
    expect(next.binding).toEqual(assetBinding("a1"));
  });
});

describe("textFragment", () => {
  it("defaults to an empty text binding", () => {
    const fragment = textFragment("prompt");
    expect(fragment.role).toBe("prompt");
    expect(fragment.id.startsWith("frag_")).toBe(true);
    expect(fragment.binding).toEqual(textBinding(""));
  });

  it("carries the provided text", () => {
    expect(textFragment("prompt", "hi").binding).toEqual(textBinding("hi"));
  });
});

describe("fragmentLabel", () => {
  const fragment = (binding: Binding): RenderFragment => ({
    id: "frag_1",
    role: "prompt",
    binding,
  });

  it("returns empty string for a missing fragment", () => {
    expect(fragmentLabel(undefined, library())).toBe("");
  });

  it("labels a literal with its text", () => {
    expect(fragmentLabel(fragment(textBinding("word")), library())).toBe("word");
  });

  it("labels a record by its library label, falling back to the id", () => {
    const lib = library({
      records: [
        {
          id: "r1",
          collectionId: "c1",
          label: "Verb",
          fieldText: { f1: "run" },
          fieldAssets: {},
          presentations: [],
        },
      ],
    });
    expect(fragmentLabel(fragment(recordBinding("r1")), lib)).toBe("Verb");
    expect(fragmentLabel(fragment(recordBinding("missing")), lib)).toBe("missing");
  });

  it("labels a field by its record field text, falling back to the field id", () => {
    const lib = library({
      records: [
        {
          id: "r1",
          collectionId: "c1",
          label: "Verb",
          fieldText: { f1: "run" },
          fieldAssets: {},
          presentations: [],
        },
      ],
    });
    expect(fragmentLabel(fragment(fieldBinding("r1", "f1")), lib)).toBe("run");
    expect(fragmentLabel(fragment(fieldBinding("r1", "f2")), lib)).toBe("f2");
  });

  it("labels an asset by its library label, falling back to the id", () => {
    const lib = library({
      assets: [{ id: "a1", kind: "image", label: "Photo", file: "p.jpg" }],
    });
    expect(fragmentLabel(fragment(assetBinding("a1")), lib)).toBe("Photo");
    expect(fragmentLabel(fragment(assetBinding("missing")), lib)).toBe("missing");
  });

  it("labels an item by its item id", () => {
    const binding: Binding = { kind: "item", recordId: "r1", fieldId: "f1", itemId: "i1" };
    expect(fragmentLabel(fragment(binding), library())).toBe("i1");
  });
});

describe("WHOLE_RECORD", () => {
  it("is a stable sentinel", () => {
    expect(WHOLE_RECORD).toBe("__whole__");
  });
});
