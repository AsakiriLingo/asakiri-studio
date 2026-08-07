import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ContentCollectionSummary } from "@core/project-reading";
import { ContentCollectionList } from "@features/content/components/ContentCollectionList";
import type { ContentMessages } from "@features/content/i18n/content-messages";

const messages: ContentMessages = {
  collectionsLabel: "Content collections",
  recordCount: (count) => `${String(count)} ${count === 1 ? "record" : "records"}`,
  empty: {
    title: "No content yet",
    description: "Content collections will appear here.",
  },
};

const collections: readonly ContentCollectionSummary[] = [
  { id: "vocabulary", name: "Vocabulary", recordCount: 3 },
  { id: "phrases", name: "Phrases", recordCount: 1 },
];

describe("ContentCollectionList", () => {
  it("shows the empty state when there are no collections", () => {
    render(<ContentCollectionList collections={[]} messages={messages} />);

    expect(screen.getByRole("heading", { name: "No content yet" })).toBeVisible();
    expect(screen.getByText("Content collections will appear here.")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders each collection with its name and record count", () => {
    render(<ContentCollectionList collections={collections} messages={messages} />);

    expect(screen.getByRole("button", { name: /Vocabulary/ })).toBeVisible();
    expect(screen.getByText("3 records")).toBeVisible();
    expect(screen.getByText("1 record")).toBeVisible();
  });

  it("tracks the selected collection", () => {
    render(<ContentCollectionList collections={collections} messages={messages} />);

    const vocabulary = screen.getByRole("button", { name: /Vocabulary/ });
    const phrases = screen.getByRole("button", { name: /Phrases/ });

    expect(vocabulary).not.toHaveAttribute("aria-current");

    fireEvent.click(vocabulary);

    expect(vocabulary).toHaveAttribute("aria-current", "true");
    expect(phrases).not.toHaveAttribute("aria-current");

    fireEvent.click(phrases);

    expect(phrases).toHaveAttribute("aria-current", "true");
    expect(vocabulary).not.toHaveAttribute("aria-current");
  });
});
