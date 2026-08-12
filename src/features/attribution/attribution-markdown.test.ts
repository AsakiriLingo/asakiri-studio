import { describe, expect, it } from "vitest";
import type { Asset } from "@core/course";
import {
  attributionsFrom,
  buildAttributionMarkdown,
} from "@features/attribution/attribution-markdown";

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: "asset_1",
    kind: "image",
    label: "photo",
    availability: "ready",
    file: "photo.jpg",
    mimeType: "image/jpeg",
    ...overrides,
  };
}

describe("attribution", () => {
  it("keeps only assets that carry a provider or license", () => {
    const entries = attributionsFrom([
      asset({ id: "a", file: "plain.jpg" }),
      asset({
        id: "b",
        file: "cat.jpg",
        metadata: { provider: "Unsplash", author: "Ada", license: "Unsplash License" },
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ file: "cat.jpg", provider: "Unsplash", author: "Ada" });
  });

  it("builds a markdown list with author, provider, and license links", () => {
    const markdown = buildAttributionMarkdown("My Course", [
      {
        file: "cat.jpg",
        provider: "Unsplash",
        author: "Ada",
        authorUrl: "https://unsplash.com/@ada",
        sourceUrl: "https://unsplash.com/photos/1",
        license: "Unsplash License",
        licenseUrl: "https://unsplash.com/license",
      },
    ]);

    expect(markdown).toContain("# Attribution");
    expect(markdown).toContain(
      "- **cat.jpg** — [Ada](https://unsplash.com/@ada) via [Unsplash](https://unsplash.com/photos/1) — License: [Unsplash License](https://unsplash.com/license)",
    );
  });
});
