import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  Asset,
  Collection,
  ContentRecord,
  Course,
  FieldDefinition,
  RecordFieldItem,
  RecordFieldValue,
} from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { DataTable } from "@shared/components/data-table";
import { Field, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Select, type SelectOption } from "@shared/components/select";
import { Status } from "@shared/components/status";
import { Tag } from "@shared/components/tag";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/content/CourseContent.module.css";

type AssetMap = ReadonlyMap<string, Asset>;

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function readText(value: RecordFieldValue | undefined): string {
  return value?.kind === "text" ? value.value : "";
}

function readAssetId(value: RecordFieldValue | undefined): string {
  return value?.kind === "asset" ? value.assetId : "";
}

function readListText(value: RecordFieldValue | undefined): string {
  if (value?.kind !== "list") return "";
  return value.items
    .filter((item): item is Extract<RecordFieldItem, { kind: "text" }> => item.kind === "text")
    .map((item) => item.value)
    .join(", ");
}

function toTextList(raw: string): RecordFieldValue {
  const items = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({ id: `item_${crypto.randomUUID()}`, kind: "text" as const, value }));
  return { kind: "list", items };
}

function assetOptions(assets: readonly Asset[], assetKind?: Asset["kind"]): SelectOption[] {
  return assets
    .filter((asset) => assetKind === undefined || asset.kind === assetKind)
    .map((asset) => ({ value: asset.id, label: asset.file ?? asset.label }));
}

// --- Read-only table cells (the clean data-table look) ---

function AssetDisplay({
  assetId,
  assets,
}: {
  readonly assetId: string;
  readonly assets: AssetMap;
}) {
  const messages = useMessages();
  const asset = assets.get(assetId);
  if (!asset) return <span className={styles.muted}>{messages.content.missing}</span>;
  return (
    <span className={styles.assetRef}>
      <Icon name={asset.kind} size={16} />
      {asset.file ?? asset.label}
    </span>
  );
}

function FieldDisplay({
  value,
  assets,
}: {
  readonly value: RecordFieldValue | undefined;
  readonly assets: AssetMap;
}): ReactNode {
  const messages = useMessages();
  if (!value || (value.kind === "text" && value.value === "")) {
    return <span className={styles.muted}>{messages.content.notSet}</span>;
  }
  if (value.kind === "text") return value.value;
  if (value.kind === "asset") return <AssetDisplay assetId={value.assetId} assets={assets} />;
  if (value.items.length === 0)
    return <span className={styles.muted}>{messages.content.empty}</span>;
  return (
    <span className={styles.optionValues}>
      {value.items.map((item) =>
        item.kind === "text" ? (
          <Tag key={item.id}>{item.value}</Tag>
        ) : (
          <AssetDisplay key={item.id} assetId={item.assetId} assets={assets} />
        ),
      )}
    </span>
  );
}

// --- Editors used inside the record editor modal ---

type SaveField = (record: ContentRecord, fieldId: string, value: RecordFieldValue) => void;

function AssetListEditor({
  value,
  field,
  assets,
  onChange,
}: {
  readonly value: RecordFieldValue | undefined;
  readonly field: FieldDefinition;
  readonly assets: readonly Asset[];
  readonly onChange: (value: RecordFieldValue) => void;
}) {
  const messages = useMessages();
  const items = value?.kind === "list" ? value.items : [];
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return (
    <span className={styles.cellEditor}>
      {items
        .filter(
          (item): item is Extract<RecordFieldItem, { kind: "asset" }> => item.kind === "asset",
        )
        .map((item) => {
          const asset = byId.get(item.assetId);
          return (
            <button
              key={item.id}
              type="button"
              className={styles.removableChip}
              aria-label={messages.common.remove(asset?.file ?? asset?.label ?? item.assetId)}
              onClick={() => {
                onChange({ kind: "list", items: items.filter((entry) => entry.id !== item.id) });
              }}
            >
              {asset ? (asset.file ?? asset.label) : messages.content.missing}
              <Icon name="trash" size={12} />
            </button>
          );
        })}
      <Select
        aria-label={field.name}
        placeholder={messages.content.addItem}
        items={assetOptions(assets, field.assetKind)}
        value=""
        onValueChange={(assetId) => {
          if (!assetId) return;
          onChange({
            kind: "list",
            items: [...items, { id: `item_${crypto.randomUUID()}`, kind: "asset", assetId }],
          });
        }}
      />
    </span>
  );
}

function FieldEditor({
  field,
  record,
  assets,
  onSave,
}: {
  readonly field: FieldDefinition;
  readonly record: ContentRecord;
  readonly assets: readonly Asset[];
  readonly onSave: SaveField;
}) {
  const messages = useMessages();
  const value = record.fields[field.id];
  const set = (next: RecordFieldValue) => {
    onSave(record, field.id, next);
  };

  let control: ReactNode;
  if (field.kind === "text" && field.cardinality === "one") {
    const current = readText(value);
    control = (
      <TextInput
        key={current}
        aria-label={field.name}
        defaultValue={current}
        onBlur={(event) => {
          if (event.currentTarget.value !== current)
            set({ kind: "text", value: event.currentTarget.value });
        }}
      />
    );
  } else if (field.kind === "text") {
    const current = readListText(value);
    control = (
      <TextInput
        key={current}
        aria-label={field.name}
        defaultValue={current}
        placeholder={messages.content.listPlaceholder}
        onBlur={(event) => {
          if (event.currentTarget.value !== current) set(toTextList(event.currentTarget.value));
        }}
      />
    );
  } else if (field.cardinality === "one") {
    control = (
      <Select
        aria-label={field.name}
        placeholder={messages.content.chooseAsset}
        items={assetOptions(assets, field.assetKind)}
        value={readAssetId(value)}
        onValueChange={(assetId) => {
          set({ kind: "asset", assetId });
        }}
      />
    );
  } else {
    control = <AssetListEditor value={value} field={field} assets={assets} onChange={set} />;
  }

  return <Field label={field.name}>{control}</Field>;
}

function Modal({
  label,
  onClose,
  wide,
  children,
}: {
  readonly label: string;
  readonly onClose: () => void;
  readonly wide?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={joinClassNames(styles.dialog, wide ? styles.dialogWide : undefined)}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface CourseContentProps {
  readonly course: Course;
  readonly onSaveRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onAddRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly onDeleteRecord: (recordId: string) => Promise<ProjectWriteResult>;
  readonly onAddCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly onUpdateCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly onDeleteCollection: (collectionId: string) => Promise<ProjectWriteResult>;
}

export function CourseContent({
  course,
  onSaveRecord,
  onAddRecord,
  onDeleteRecord,
  onAddCollection,
  onUpdateCollection,
  onDeleteCollection,
}: CourseContentProps) {
  const messages = useMessages();
  const t = messages.content;
  const [selectedId, setSelectedId] = useState(course.collections[0]?.id ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showingSettings, setShowingSettings] = useState(false);

  const collection =
    course.collections.find((entry) => entry.id === selectedId) ?? course.collections[0] ?? null;

  const assets = useMemo<AssetMap>(
    () => new Map(course.assets.map((asset) => [asset.id, asset])),
    [course.assets],
  );

  const displayRecords = useMemo(
    () =>
      collection ? course.records.filter((record) => record.collectionId === collection.id) : [],
    [collection, course.records],
  );

  const persist = (run: Promise<ProjectWriteResult>) => {
    setSaveState("saving");
    void run.then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };

  const saveField: SaveField = (record, fieldId, value) => {
    persist(onSaveRecord({ ...record, fields: { ...record.fields, [fieldId]: value } }));
  };

  const removeRecord = (recordId: string) => {
    persist(onDeleteRecord(recordId));
  };

  // Refs keep the memoized columns stable across record edits (see the earlier
  // remount crash): the cell functions never change identity, so editing never
  // remounts a cell.
  const removeRecordRef = useRef(removeRecord);
  useEffect(() => {
    removeRecordRef.current = removeRecord;
  });

  const saveCollection = (next: Collection) => {
    persist(onUpdateCollection(next));
  };

  const openNewCollection = () => {
    setNewCollectionName(t.newCollectionName);
    setCreatingCollection(true);
  };

  const confirmNewCollection = () => {
    const id = `collection_${crypto.randomUUID()}`;
    const next: Collection = {
      id,
      name: newCollectionName.trim() || t.newCollectionName,
      fields: [
        {
          id: `field_${crypto.randomUUID()}`,
          name: t.newFieldName,
          kind: "text",
          cardinality: "one",
          required: false,
        },
      ],
    };
    setCreatingCollection(false);
    setSaveState("saving");
    void onAddCollection(next).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
      if (result.status === "saved") setSelectedId(id);
    });
  };

  const addRecord = () => {
    if (!collection) return;
    const record: ContentRecord = {
      id: `record_${crypto.randomUUID()}`,
      collectionId: collection.id,
      fields: {},
    };
    setSaveState("saving");
    void onAddRecord(record).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
      // Open the new record in the editor so the empty row is filled in a form.
      if (result.status === "saved") setEditingRecordId(record.id);
    });
  };

  const addField = () => {
    if (!collection) return;
    saveCollection({
      ...collection,
      fields: [
        ...collection.fields,
        {
          id: `field_${crypto.randomUUID()}`,
          name: t.newFieldName,
          kind: "text",
          cardinality: "one",
          required: false,
        },
      ],
    });
  };

  const updateFieldDef = (fieldId: string, changes: Partial<FieldDefinition>) => {
    if (!collection) return;
    saveCollection({
      ...collection,
      fields: collection.fields.map((field) =>
        field.id === fieldId ? { ...field, ...changes } : field,
      ),
    });
  };

  const removeFieldDef = (fieldId: string) => {
    if (!collection) return;
    saveCollection({
      ...collection,
      fields: collection.fields.filter((field) => field.id !== fieldId),
    });
  };

  // Stable so the memoized DataTable is not re-rendered by unrelated state
  // changes (opening a modal, save-status updates).
  const handleEditCell = useCallback(
    (rowIndex: number, columnId: string, value: string) => {
      const target = displayRecords[rowIndex];
      if (!target) return;
      setSaveState("saving");
      void onSaveRecord({
        ...target,
        fields: { ...target.fields, [columnId]: { kind: "text", value } },
      }).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    },
    [displayRecords, onSaveRecord],
  );

  const columns = useMemo<ColumnDef<ContentRecord>[]>(() => {
    if (!collection) return [];
    return [
      ...collection.fields.map((field, index) => {
        const primary = index === 0;
        if (field.kind === "text" && field.cardinality === "one") {
          return {
            id: field.id,
            accessorFn: (record: ContentRecord) => readText(record.fields[field.id]),
            header: field.name,
            meta: primary ? { primary: true, editable: true } : { editable: true },
          } satisfies ColumnDef<ContentRecord>;
        }
        return {
          id: field.id,
          header: field.name,
          ...(primary ? { meta: { primary: true } } : {}),
          cell: ({ row }: { row: { original: ContentRecord } }) => (
            <FieldDisplay value={row.original.fields[field.id]} assets={assets} />
          ),
        } satisfies ColumnDef<ContentRecord>;
      }),
      {
        id: "__actions",
        header: "",
        cell: ({ row }: { row: { original: ContentRecord } }) => (
          <span className={styles.rowActions}>
            <IconButton
              aria-label={messages.common.edit}
              size="sm"
              onClick={() => {
                setEditingRecordId(row.original.id);
              }}
            >
              <Icon name="details" size={18} />
            </IconButton>
            <IconButton
              aria-label={messages.content.deleteRecord}
              size="sm"
              onClick={() => {
                removeRecordRef.current(row.original.id);
              }}
            >
              <Icon name="trash" size={18} />
            </IconButton>
          </span>
        ),
      },
    ];
  }, [collection, assets, messages]);

  const editingRecord =
    editingRecordId !== null
      ? (course.records.find((record) => record.id === editingRecordId) ?? null)
      : null;

  const saveStatus =
    saveState === "idle" ? null : (
      <Status tone={saveState === "failed" ? "warning" : "default"}>
        {saveState === "saving"
          ? messages.common.saving
          : saveState === "failed"
            ? messages.common.saveFailed
            : messages.common.savedLocally}
      </Status>
    );

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Button onClick={openNewCollection}>
            <Icon name="plus" size={18} />
            {t.newCollection}
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
              {course.collections.map((entry) => {
                const count = course.records.filter((r) => r.collectionId === entry.id).length;
                return (
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
                      {entry.description ? (
                        <span className={styles.rowDetail}>{entry.description}</span>
                      ) : null}
                    </span>
                    <span className={styles.count}>{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section aria-label={collection.name}>
            <div className={styles.tableToolbar}>
              <Button variant="secondary" onClick={addRecord}>
                <Icon name="plus" size={18} />
                {t.addRecord}
              </Button>
              <span className={styles.barSpacer} />
              {saveStatus}
              <IconButton
                aria-label={t.collectionSettings}
                size="sm"
                onClick={() => {
                  setShowingSettings(true);
                }}
              >
                <Icon name="details" size={18} />
              </IconButton>
            </div>
            <DataTable
              columns={columns}
              data={displayRecords}
              ariaLabel={t.recordsAria(collection.name)}
              searchable
              onEditCell={handleEditCell}
            />
          </section>
        </div>
      )}

      {creatingCollection ? (
        <Modal
          label={t.newCollection}
          onClose={() => {
            setCreatingCollection(false);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              confirmNewCollection();
            }}
          >
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>{t.newCollection}</h2>
            </div>
            <div className={styles.dialogBody}>
              <Field label={t.collectionName}>
                <TextInput
                  autoFocus
                  value={newCollectionName}
                  autoComplete="off"
                  onChange={(event) => {
                    setNewCollectionName(event.currentTarget.value);
                  }}
                />
              </Field>
            </div>
            <div className={styles.dialogActions}>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setCreatingCollection(false);
                }}
              >
                {messages.common.cancel}
              </Button>
              <Button type="submit">{messages.common.add}</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingRecord && collection ? (
        <Modal
          label={t.editRecord}
          wide
          onClose={() => {
            setEditingRecordId(null);
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{t.editRecord}</h2>
          </div>
          <div className={styles.dialogBody}>
            {collection.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                record={editingRecord}
                assets={course.assets}
                onSave={saveField}
              />
            ))}
          </div>
          <div className={styles.dialogActions}>
            {saveStatus}
            <Button
              onClick={() => {
                setEditingRecordId(null);
              }}
            >
              {messages.common.done}
            </Button>
          </div>
        </Modal>
      ) : null}

      {showingSettings && collection ? (
        <Modal
          label={t.collectionSettings}
          wide
          onClose={() => {
            setShowingSettings(false);
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>{t.collectionSettings}</h2>
          </div>
          <div className={styles.dialogBody}>
            <Field label={t.collectionName}>
              <TextInput
                key={`name-${collection.id}`}
                defaultValue={collection.name}
                autoComplete="off"
                onBlur={(event) => {
                  if (event.currentTarget.value !== collection.name) {
                    saveCollection({ ...collection, name: event.currentTarget.value });
                  }
                }}
              />
            </Field>
            <Field label={t.collectionDescription}>
              <TextInput
                key={`desc-${collection.id}`}
                defaultValue={collection.description ?? ""}
                autoComplete="off"
                onBlur={(event) => {
                  if (event.currentTarget.value !== (collection.description ?? "")) {
                    saveCollection({ ...collection, description: event.currentTarget.value });
                  }
                }}
              />
            </Field>

            <PanelHeader title={t.fieldsTitle} />
            {collection.fields.map((field) => (
              <div key={field.id} className={styles.fieldRow}>
                <TextInput
                  className={styles.fieldNameInput}
                  aria-label={t.fieldName}
                  defaultValue={field.name}
                  key={`fname-${field.id}`}
                  onBlur={(event) => {
                    if (event.currentTarget.value !== field.name) {
                      updateFieldDef(field.id, { name: event.currentTarget.value });
                    }
                  }}
                />
                <Select
                  className={styles.fieldTypeSelect}
                  aria-label={t.fieldType}
                  items={[
                    { value: "text", label: t.kindText },
                    { value: "asset", label: t.kindAsset },
                  ]}
                  value={field.kind}
                  onValueChange={(kind) => {
                    updateFieldDef(field.id, { kind: kind as FieldDefinition["kind"] });
                  }}
                />
                <Select
                  className={styles.fieldCardSelect}
                  aria-label={t.allows}
                  items={[
                    { value: "one", label: t.cardinalityOne },
                    { value: "many", label: t.cardinalityMany },
                  ]}
                  value={field.cardinality}
                  onValueChange={(cardinality) => {
                    updateFieldDef(field.id, {
                      cardinality: cardinality as FieldDefinition["cardinality"],
                    });
                  }}
                />
                <IconButton
                  aria-label={messages.common.remove(field.name)}
                  size="sm"
                  onClick={() => {
                    removeFieldDef(field.id);
                  }}
                >
                  <Icon name="trash" size={18} />
                </IconButton>
              </div>
            ))}
            <div>
              <Button variant="secondary" onClick={addField}>
                <Icon name="plus" size={18} />
                {t.addField}
              </Button>
            </div>
          </div>
          <div className={styles.dialogActions}>
            <Button
              variant="ghost"
              className={styles.dangerAction}
              onClick={() => {
                setShowingSettings(false);
                persist(onDeleteCollection(collection.id));
              }}
            >
              {t.deleteCollection}
            </Button>
            <span className={styles.barSpacer} />
            <Button
              onClick={() => {
                setShowingSettings(false);
              }}
            >
              {messages.common.done}
            </Button>
          </div>
        </Modal>
      ) : null}
    </WorkInner>
  );
}
