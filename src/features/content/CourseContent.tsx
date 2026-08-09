import { useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@shared/components/button";
import { DataTable } from "@shared/components/data-table";
import { Icon } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/content/CourseContent.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

interface Collection {
  readonly id: string;
  readonly name: string;
  readonly fields: string;
  readonly count: number;
}

interface AssetRef {
  readonly kind: "audio" | "image";
  readonly file: string;
}

interface VocabRecord {
  readonly id: string;
  readonly japanese: string;
  readonly english: string;
  readonly japaneseAudio: AssetRef | null;
  readonly englishAudio: AssetRef | null;
  readonly image: AssetRef | null;
}

const COLLECTIONS: readonly Collection[] = [
  {
    id: "vocabulary",
    name: "Vocabulary",
    fields: "Japanese, English, audio, image",
    count: 6,
  },
];

const INITIAL_RECORDS: readonly VocabRecord[] = [
  {
    id: "neko",
    japanese: "猫",
    english: "Cat",
    japaneseAudio: { kind: "audio", file: "neko-ja.mp3" },
    englishAudio: { kind: "audio", file: "cat-en.mp3" },
    image: { kind: "image", file: "cat.png" },
  },
  {
    id: "inu",
    japanese: "犬",
    english: "Dog",
    japaneseAudio: null,
    englishAudio: null,
    image: null,
  },
  {
    id: "tori",
    japanese: "鳥",
    english: "Bird",
    japaneseAudio: null,
    englishAudio: null,
    image: null,
  },
  {
    id: "sakana",
    japanese: "魚",
    english: "Fish",
    japaneseAudio: null,
    englishAudio: null,
    image: null,
  },
  {
    id: "mizu",
    japanese: "水",
    english: "Water",
    japaneseAudio: null,
    englishAudio: null,
    image: null,
  },
  {
    id: "pan",
    japanese: "パン",
    english: "Bread",
    japaneseAudio: null,
    englishAudio: null,
    image: null,
  },
];

function AssetCell({ asset }: { readonly asset: AssetRef | null }): ReactNode {
  if (!asset) {
    return <span className={styles.muted}>Not set</span>;
  }
  return (
    <span className={styles.assetRef}>
      <Icon name={asset.kind} size={16} />
      {asset.file}
    </span>
  );
}

const VOCAB_COLUMNS: ColumnDef<VocabRecord>[] = [
  {
    accessorKey: "japanese",
    header: "Japanese",
    meta: { primary: true, editable: true },
  },
  { accessorKey: "english", header: "English", meta: { editable: true } },
  {
    id: "japaneseAudio",
    header: "Japanese audio",
    cell: ({ row }) => <AssetCell asset={row.original.japaneseAudio} />,
  },
  {
    id: "englishAudio",
    header: "English audio",
    cell: ({ row }) => <AssetCell asset={row.original.englishAudio} />,
  },
  {
    id: "image",
    header: "Image",
    cell: ({ row }) => <AssetCell asset={row.original.image} />,
  },
];

export function CourseContent() {
  const [records, setRecords] = useState<readonly VocabRecord[]>(INITIAL_RECORDS);

  const handleEditCell = (rowIndex: number, columnId: string, value: string) => {
    setRecords((current) =>
      current.map((record, index) => {
        if (index !== rowIndex) return record;
        if (columnId === "japanese") return { ...record, japanese: value };
        if (columnId === "english") return { ...record, english: value };
        return record;
      }),
    );
  };

  return (
    <WorkInner>
      <WorkHeader
        title="Content"
        description="Create reusable records first, then reference them from lessons, rich media, and exercises."
        actions={
          <Button>
            <Icon name="plus" size={18} />
            New content
          </Button>
        }
      />

      <div className={styles.layout}>
        <aside className={styles.collectionList}>
          <PanelHeader title="Collections" />
          <div className={styles.list}>
            {COLLECTIONS.map((collection, index) => (
              <button
                key={collection.id}
                type="button"
                className={joinClassNames(
                  styles.listRow,
                  index === 0 ? styles.selected : undefined,
                )}
              >
                <span>
                  <span className={styles.rowTitle}>{collection.name}</span>
                  <span className={styles.rowDetail}>{collection.fields}</span>
                </span>
                <span className={styles.count}>{collection.count}</span>
              </button>
            ))}
          </div>
        </aside>

        <section aria-labelledby="vocabulary-title">
          <PanelHeader
            title="Vocabulary"
            titleId="vocabulary-title"
            description="6 records · autosaved locally"
          />
          <DataTable
            columns={VOCAB_COLUMNS}
            data={records}
            ariaLabel="Vocabulary records"
            onEditCell={handleEditCell}
          />
        </section>
      </div>
    </WorkInner>
  );
}
