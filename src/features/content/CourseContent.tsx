import { useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Asset, Collection, ContentRecord, Course, RecordFieldValue } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { DataTable } from "@shared/components/data-table";
import { Icon } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import { Tag } from "@shared/components/tag";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/content/CourseContent.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function readText(value: RecordFieldValue | undefined): string {
  if (value?.kind === "text") return value.value;
  return "";
}

type AssetMap = ReadonlyMap<string, Asset>;

function AssetValue({ assetId, assets }: { readonly assetId: string; readonly assets: AssetMap }) {
  const messages = useMessages();
  const asset = assets.get(assetId);
  if (!asset) {
    return <span className={styles.muted}>{messages.content.missing}</span>;
  }
  return (
    <span className={styles.assetRef}>
      <Icon name={asset.kind} size={16} />
      {asset.file ?? asset.label}
    </span>
  );
}

function FieldValueCell({
  value,
  assets,
}: {
  readonly value: RecordFieldValue | undefined;
  readonly assets: AssetMap;
}): ReactNode {
  const messages = useMessages();
  if (!value) {
    return <span className={styles.muted}>{messages.content.notSet}</span>;
  }
  if (value.kind === "text") {
    return value.value;
  }
  if (value.kind === "asset") {
    return <AssetValue assetId={value.assetId} assets={assets} />;
  }
  if (value.items.length === 0) {
    return <span className={styles.muted}>{messages.content.empty}</span>;
  }
  return (
    <span className={styles.optionValues}>
      {value.items.map((item) =>
        item.kind === "text" ? (
          <Tag key={item.id}>{item.value}</Tag>
        ) : (
          <AssetValue key={item.id} assetId={item.assetId} assets={assets} />
        ),
      )}
    </span>
  );
}

function buildColumns(collection: Collection, assets: AssetMap): ColumnDef<ContentRecord>[] {
  return collection.fields.map((field, index) => {
    const primary = index === 0;
    if (field.kind === "text" && field.cardinality === "one") {
      return {
        id: field.id,
        accessorFn: (record) => readText(record.fields[field.id]),
        header: field.name,
        meta: primary ? { primary: true, editable: true } : { editable: true },
      };
    }
    return {
      id: field.id,
      header: field.name,
      ...(primary ? { meta: { primary: true } } : {}),
      cell: ({ row }) => <FieldValueCell value={row.original.fields[field.id]} assets={assets} />,
    };
  });
}

function fieldSummary(collection: Collection): string {
  return collection.fields.map((field) => field.name).join(", ");
}

export interface CourseContentProps {
  readonly course: Course;
}

export function CourseContent({ course }: CourseContentProps) {
  const messages = useMessages();
  const t = messages.content;
  const [records, setRecords] = useState<readonly ContentRecord[]>(course.records);
  const [selectedId, setSelectedId] = useState(course.collections[0]?.id ?? "");

  const collection =
    course.collections.find((entry) => entry.id === selectedId) ?? course.collections[0] ?? null;

  const assets = useMemo(
    () => new Map(course.assets.map((asset) => [asset.id, asset])),
    [course.assets],
  );

  const countFor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.collectionId, (counts.get(record.collectionId) ?? 0) + 1);
    }
    return counts;
  }, [records]);

  const displayRecords = useMemo(
    () => (collection ? records.filter((record) => record.collectionId === collection.id) : []),
    [collection, records],
  );

  const columns = useMemo(
    () => (collection ? buildColumns(collection, assets) : []),
    [collection, assets],
  );

  const handleEditCell = (rowIndex: number, columnId: string, value: string) => {
    const target = displayRecords[rowIndex];
    if (!target) return;
    setRecords((current) =>
      current.map((record) =>
        record.id === target.id
          ? { ...record, fields: { ...record.fields, [columnId]: { kind: "text", value } } }
          : record,
      ),
    );
  };

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Button>
            <Icon name="plus" size={18} />
            {t.newContent}
          </Button>
        }
      />

      {course.collections.length === 0 || !collection ? (
        <PanelHeader title={t.noCollectionsTitle} description={t.noCollectionsBody} />
      ) : (
        <div className={styles.layout}>
          <aside className={styles.collectionList}>
            <PanelHeader title={t.collections} />
            <div className={styles.list}>
              {course.collections.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={joinClassNames(
                    styles.listRow,
                    entry.id === collection.id ? styles.selected : undefined,
                  )}
                  onClick={() => {
                    setSelectedId(entry.id);
                  }}
                >
                  <span>
                    <span className={styles.rowTitle}>{entry.name}</span>
                    <span className={styles.rowDetail}>{fieldSummary(entry)}</span>
                  </span>
                  <span className={styles.count}>{countFor.get(entry.id) ?? 0}</span>
                </button>
              ))}
            </div>
          </aside>

          <section aria-labelledby="collection-title">
            <PanelHeader
              title={collection.name}
              titleId="collection-title"
              description={t.records(displayRecords.length)}
            />
            <DataTable
              columns={columns}
              data={displayRecords}
              ariaLabel={t.recordsAria(collection.name)}
              onEditCell={handleEditCell}
            />
          </section>
        </div>
      )}
    </WorkInner>
  );
}
