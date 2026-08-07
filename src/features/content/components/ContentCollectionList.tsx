import { useState } from "react";
import type { ContentCollectionSummary } from "@core/project-reading";
import type { ContentMessages } from "@features/content/i18n/content-messages";
import styles from "@features/content/components/ContentCollectionList.module.css";

interface ContentCollectionListProps {
  readonly collections: readonly ContentCollectionSummary[];
  readonly messages: ContentMessages;
}

export function ContentCollectionList({ collections, messages }: ContentCollectionListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (collections.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>{messages.empty.title}</h2>
        <p className={styles.emptyDescription}>{messages.empty.description}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} aria-label={messages.collectionsLabel}>
      {collections.map((collection) => (
        <li key={collection.id}>
          <button
            aria-current={selectedId === collection.id ? "true" : undefined}
            className={styles.item}
            onClick={() => {
              setSelectedId(collection.id);
            }}
            type="button"
          >
            <span className={styles.name}>{collection.name}</span>
            <span className={styles.count}>{messages.recordCount(collection.recordCount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
