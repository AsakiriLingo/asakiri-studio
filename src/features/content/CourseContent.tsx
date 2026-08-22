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
import { ContextMenu } from "@base-ui/react/context-menu";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { DataTable } from "@shared/components/data-table";
import { ScrollArea } from "@shared/components/scroll-area";
import { Field, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Select } from "@shared/components/select";
import { Status } from "@shared/components/status";
import { Tag } from "@shared/components/tag";
import {
  AssetFieldControl,
  AssetListFieldControl,
  type ImportAsset,
  type LoadPreview,
} from "@features/content/AssetField";
import styles from "@features/content/CourseContent.module.css";

type AssetMap = ReadonlyMap<string, Asset>;

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function readText(value: RecordFieldValue | undefined): string {
  return value?.kind === "text" ? value.value : "";
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

function FieldEditor({
  field,
  record,
  assets,
  importAsset,
  loadPreview,
  onSave,
}: {
  readonly field: FieldDefinition;
  readonly record: ContentRecord;
  readonly assets: readonly Asset[];
  readonly importAsset: ImportAsset;
  readonly loadPreview: LoadPreview;
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
      <AssetFieldControl
        value={value}
        field={field}
        assets={assets}
        importAsset={importAsset}
        loadPreview={loadPreview}
        onChange={set}
      />
    );
  } else {
    control = (
      <AssetListFieldControl
        value={value}
        field={field}
        assets={assets}
        importAsset={importAsset}
        loadPreview={loadPreview}
        onChange={set}
      />
    );
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
  readonly onImportAsset: ImportAsset;
  readonly onImportSpreadsheet: () => Promise<void>;
  readonly onLoadPreview: LoadPreview;
  readonly sidebarCollapsed?: boolean;
  readonly onSidebarCollapsedChange?: (collapsed: boolean) => void;
}

export function CourseContent({
  course,
  onSaveRecord,
  onAddRecord,
  onDeleteRecord,
  onAddCollection,
  onUpdateCollection,
  onDeleteCollection,
  onImportAsset,
  onImportSpreadsheet,
  onLoadPreview,
  sidebarCollapsed = false,
  onSidebarCollapsedChange,
}: CourseContentProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.content;
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState(course.collections[0]?.id ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showingSettings, setShowingSettings] = useState(false);
  const [importing, setImporting] = useState(false);

  const runSpreadsheetImport = () => {
    setImporting(true);
    void onImportSpreadsheet().finally(() => {
      setImporting(false);
    });
  };

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

  const editCollection = (entry: Collection) => {
    setSelectedId(entry.id);
    setShowingSettings(true);
  };

  const removeCollection = async (entry: Collection) => {
    const ok = await confirm({
      title: t.confirmDeleteCollectionTitle,
      description: format(t.confirmDeleteCollectionBody, { name: entry.name }),
      confirmLabel: t.deleteCollection,
    });
    if (!ok) return;
    if (entry.id === selectedId) setShowingSettings(false);
    persist(onDeleteCollection(entry.id));
  };

  const saveField: SaveField = (record, fieldId, value) => {
    persist(onSaveRecord({ ...record, fields: { ...record.fields, [fieldId]: value } }));
  };

  const saveFieldRef = useRef(saveField);
  const importAssetRef = useRef(onImportAsset);
  const loadPreviewRef = useRef(onLoadPreview);
  useEffect(() => {
    saveFieldRef.current = saveField;
    importAssetRef.current = onImportAsset;
    loadPreviewRef.current = onLoadPreview;
  });
  const importAsset = useCallback<ImportAsset>(() => importAssetRef.current(), []);
  const loadPreview = useCallback<LoadPreview>((assetId) => loadPreviewRef.current(assetId), []);

  const removeRecord = async (recordId: string) => {
    const ok = await confirm({
      title: t.confirmDeleteRecordTitle,
      description: t.confirmDeleteRecordBody,
      confirmLabel: t.deleteRecord,
    });
    if (!ok) return;
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

  const removeFieldDef = async (fieldId: string) => {
    if (!collection) return;
    const field = collection.fields.find((entry) => entry.id === fieldId);
    const ok = await confirm({
      title: t.confirmDeleteFieldTitle,
      description: field ? format(t.confirmDeleteFieldBody, { name: field.name }) : undefined,
    });
    if (!ok) return;
    saveCollection({
      ...collection,
      fields: collection.fields.filter((entry) => entry.id !== fieldId),
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
        if (field.kind === "asset") {
          const Control = field.cardinality === "one" ? AssetFieldControl : AssetListFieldControl;
          return {
            id: field.id,
            header: field.name,
            ...(primary ? { meta: { primary: true } } : {}),
            cell: ({ row }: { row: { original: ContentRecord } }) => (
              <Control
                value={row.original.fields[field.id]}
                field={field}
                assets={course.assets}
                importAsset={importAsset}
                loadPreview={loadPreview}
                onChange={(value) => {
                  saveFieldRef.current(row.original, field.id, value);
                }}
              />
            ),
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
              <Icon name="edit" size={18} />
            </IconButton>
            <IconButton
              aria-label={messages.content.deleteRecord}
              size="sm"
              onClick={() => {
                void removeRecordRef.current(row.original.id);
              }}
            >
              <Icon name="trash" size={18} />
            </IconButton>
          </span>
        ),
      },
    ];
  }, [collection, assets, course.assets, messages, importAsset, loadPreview]);

  const editingRecord =
    editingRecordId !== null
      ? (course.records.find((record) => record.id === editingRecordId) ?? null)
      : null;

  const saveStatus =
    saveState === "saving" ? (
      <Status>{messages.common.saving}</Status>
    ) : saveState === "failed" ? (
      <Status tone="warning">{messages.common.saveFailed}</Status>
    ) : null;

  return (
    <div className={styles.library}>
      <nav
        className={joinClassNames(styles.sidebar, sidebarCollapsed ? styles.collapsed : undefined)}
        aria-label={t.collections}
      >
        {sidebarCollapsed ? null : (
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>{t.collections}</span>
            <div className={styles.sidebarHeaderActions}>
              <IconButton aria-label={t.newCollection} onClick={openNewCollection}>
                <Icon name="plus" size={18} />
              </IconButton>
            </div>
          </div>
        )}
        {sidebarCollapsed ? null : course.collections.length === 0 ? (
          <p className={styles.sidebarEmpty}>{t.noCollectionsBody}</p>
        ) : (
          <div className={styles.list}>
            {course.collections.map((entry) => {
              const count = course.records.filter((r) => r.collectionId === entry.id).length;
              return (
                <ContextMenu.Root key={entry.id}>
                  <ContextMenu.Trigger
                    render={
                      <button
                        type="button"
                        className={joinClassNames(
                          styles.listRow,
                          entry.id === collection?.id ? styles.selected : undefined,
                        )}
                        aria-current={entry.id === collection?.id ? "page" : undefined}
                        onClick={() => {
                          setSelectedId(entry.id);
                        }}
                      >
                        <span className={styles.rowTitle}>{entry.name}</span>
                        <span className={styles.count}>{count}</span>
                      </button>
                    }
                  />
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner className={styles.menuPositioner}>
                      <ContextMenu.Popup className={styles.menuPopup}>
                        <ContextMenu.Item
                          className={styles.menuItem}
                          onClick={() => {
                            editCollection(entry);
                          }}
                        >
                          {messages.common.edit}
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className={joinClassNames(styles.menuItem, styles.menuItemDanger)}
                          onClick={() => {
                            void removeCollection(entry);
                          }}
                        >
                          {messages.common.delete}
                        </ContextMenu.Item>
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </div>
        )}
        <div
          className={joinClassNames(
            styles.sidebarFooter,
            sidebarCollapsed ? styles.sidebarFooterCollapsed : undefined,
          )}
        >
          <IconButton
            aria-label={
              sidebarCollapsed
                ? messages.workspace.expandSidebar
                : messages.workspace.collapseSidebar
            }
            onClick={() => {
              onSidebarCollapsedChange?.(!sidebarCollapsed);
            }}
          >
            <Icon name="sidebar" size={18} />
          </IconButton>
        </div>
      </nav>

      <div className={styles.content}>
        {course.collections.length === 0 || !collection ? (
          <div className={styles.empty}>
            <PanelHeader title={t.noCollectionsTitle} description={t.noCollectionsBody} />
          </div>
        ) : (
          <section className={styles.tableSection} aria-label={collection.name}>
            <DataTable
              columns={columns}
              data={displayRecords}
              ariaLabel={format(t.recordsAria, { collection: collection.name })}
              searchable
              onEditCell={handleEditCell}
              actions={
                <>
                  {saveStatus}
                  <Button
                    variant="ghost"
                    size="compact"
                    disabled={importing}
                    onClick={runSpreadsheetImport}
                  >
                    <Icon name="upload" size={18} />
                    {messages.importer.importSpreadsheet}
                  </Button>
                  <Button variant="secondary" onClick={addRecord}>
                    <Icon name="plus" size={18} />
                    {t.addRecord}
                  </Button>
                </>
              }
            />
          </section>
        )}
      </div>

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
          <ScrollArea
            viewportClassName={styles.dialogViewport}
            contentClassName={styles.dialogBody}
          >
            {collection.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                record={editingRecord}
                assets={course.assets}
                importAsset={importAsset}
                loadPreview={loadPreview}
                onSave={saveField}
              />
            ))}
          </ScrollArea>
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
          <ScrollArea
            viewportClassName={styles.dialogViewport}
            contentClassName={styles.dialogBody}
          >
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
                  aria-label={format(messages.common.remove, { label: field.name })}
                  size="sm"
                  onClick={() => {
                    void removeFieldDef(field.id);
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
          </ScrollArea>
          <div className={styles.dialogActions}>
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
    </div>
  );
}
