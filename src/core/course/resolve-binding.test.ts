import { describe, expect, it } from "vitest";
import { createBindingResolver } from "@core/course";
import type { Course } from "@core/course";

const course: Course = {
  project: {
    id: "course_x",
    title: "X",
    subtitle: "",
    description: "",
    defaultLocale: "en",
    learningLocales: ["ja"],
    taughtFlag: "",
    taughtFlagAssetId: null,
    level: "",
    estimatedLength: "",
    version: "",
    releasedOn: "",
    license: "",
    copyrightHolder: "",
    copyrightYear: "",
    coverAssetId: null,
    contributors: [],
    funding: [],
    sponsors: [],
  },
  collections: [],
  records: [
    {
      id: "record_cat",
      collectionId: "collection_vocabulary",
      fields: {
        field_english: { kind: "text", value: "cat" },
        field_images: {
          kind: "list",
          items: [
            { id: "image_cat", kind: "asset", label: "Cat", assetId: "asset_cat_image" },
            { id: "note_cat", kind: "text", value: "a cat", locale: "en" },
          ],
        },
      },
    },
  ],
  assets: [
    {
      id: "asset_cat_image",
      kind: "image",
      label: "Cat illustration",
      availability: "ready",
      file: "original.svg",
      mimeType: "image/svg+xml",
    },
  ],
  lessons: [],
  mediaFolders: [],
  outline: [],
};

describe("createBindingResolver", () => {
  const resolver = createBindingResolver(course);

  it("resolves a scalar text field to text", () => {
    expect(
      resolver.resolve({ kind: "field", recordId: "record_cat", fieldId: "field_english" }),
    ).toEqual({ kind: "text", text: "cat" });
  });

  it("resolves a list field to a list of resolved items", () => {
    const resolved = resolver.resolve({
      kind: "field",
      recordId: "record_cat",
      fieldId: "field_images",
    });

    expect(resolved).toEqual({
      kind: "list",
      items: [
        {
          kind: "asset",
          asset: course.assets[0],
          label: "Cat",
        },
        { kind: "text", text: "a cat", locale: "en" },
      ],
    });
  });

  it("resolves an item binding to the asset it references", () => {
    expect(
      resolver.resolve({
        kind: "item",
        recordId: "record_cat",
        fieldId: "field_images",
        itemId: "image_cat",
      }),
    ).toEqual({ kind: "asset", asset: course.assets[0], label: "Cat" });
  });

  it("resolves an asset binding", () => {
    expect(resolver.resolve({ kind: "asset", assetId: "asset_cat_image" })).toEqual({
      kind: "asset",
      asset: course.assets[0],
    });
  });

  it("resolves a record binding", () => {
    expect(resolver.resolve({ kind: "record", recordId: "record_cat" })).toEqual({
      kind: "record",
      record: course.records[0],
    });
  });

  it("resolves a structured text literal to text", () => {
    expect(resolver.resolve({ kind: "literal", value: { type: "text", text: "Hello" } })).toEqual({
      kind: "text",
      text: "Hello",
    });
  });

  it("reports missing references instead of throwing", () => {
    expect(resolver.resolve({ kind: "record", recordId: "record_missing" })).toEqual({
      kind: "missing",
      reason: "record record_missing",
    });
    expect(
      resolver.resolve({ kind: "field", recordId: "record_cat", fieldId: "field_absent" }),
    ).toEqual({ kind: "missing", reason: "field record_cat.field_absent" });
    expect(resolver.resolve({ kind: "asset", assetId: "asset_missing" })).toEqual({
      kind: "missing",
      reason: "asset asset_missing",
    });
  });
});
