import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckChoice, RadioChoice, RadioChoices } from "@shared/components/choice";
import { Icon, type IconName } from "@shared/components/icon";
import { useMessages } from "@shared/i18n";
import type {
  EditorAsset,
  EditorCollection,
  EditorPresentation,
  EditorRecord,
  RichEditorLibrary,
} from "@shared/components/rich-editor/library";
import type { SlashState } from "@shared/components/rich-editor/slash-command";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

const ASSET_ICON: Record<EditorAsset["kind"], IconName> = {
  audio: "audio",
  video: "video",
  image: "image",
};

function makePresentationId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.abs(Date.now()).toString(36);
  return `pres_${uuid.replace(/-/g, "").slice(0, 8)}`;
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

type Screen =
  | { readonly kind: "root" }
  | { readonly kind: "records"; readonly collection: EditorCollection }
  | {
      readonly kind: "configure";
      readonly collection: EditorCollection;
      readonly record: EditorRecord;
    };

export interface SlashMenuProps {
  readonly state: SlashState;
  readonly library: RichEditorLibrary;
  readonly onClose: () => void;
  readonly onInsertAsset: (asset: EditorAsset) => void;
  readonly onInsertRecord: (record: EditorRecord, presentation: EditorPresentation) => void;
  readonly onImportMedia?: (() => void | Promise<void>) | undefined;
}

export function SlashMenu({
  state,
  library,
  onClose,
  onInsertAsset,
  onInsertRecord,
  onImportMedia,
}: SlashMenuProps) {
  const messages = useMessages();
  const t = messages.lesson.slash;
  const containerRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "root" });
  const [highlight, setHighlight] = useState(0);
  const [importing, setImporting] = useState(false);

  const assets = useMemo(
    () => library.assets.filter((asset) => matches(asset.label, state.query)),
    [library.assets, state.query],
  );
  const collections = useMemo(
    () => library.collections.filter((collection) => matches(collection.name, state.query)),
    [library.collections, state.query],
  );

  const rootRows = useMemo(
    () => [
      ...(onImportMedia ? [{ type: "import" as const }] : []),
      ...assets.map((asset) => ({ type: "asset" as const, asset })),
      ...collections.map((collection) => ({ type: "collection" as const, collection })),
    ],
    [onImportMedia, assets, collections],
  );

  const runImport = useCallback(() => {
    if (!onImportMedia || importing) return;
    setImporting(true);
    void Promise.resolve(onImportMedia()).finally(() => {
      setImporting(false);
    });
  }, [onImportMedia, importing]);

  const highlightIndex = rootRows.length > 0 ? Math.min(highlight, rootRows.length - 1) : 0;

  const openCollection = (collection: EditorCollection) => {
    setHighlight(0);
    setScreen({ kind: "records", collection });
  };
  const openConfigure = (collection: EditorCollection, record: EditorRecord) => {
    setScreen({ kind: "configure", collection, record });
  };
  const back = () => {
    setHighlight(0);
    setScreen((current) =>
      current.kind === "configure"
        ? { kind: "records", collection: current.collection }
        : { kind: "root" },
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (screen.kind === "root") onClose();
        else back();
        return;
      }
      if (screen.kind !== "root") return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setHighlight((index) => Math.min(index + 1, Math.max(rootRows.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setHighlight((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        const row = rootRows[highlightIndex];
        if (!row) return;
        if (row.type === "import") runImport();
        else if (row.type === "asset") onInsertAsset(row.asset);
        else openCollection(row.collection);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [screen, rootRows, highlightIndex, onClose, onInsertAsset, runImport]);

  const style = {
    position: "fixed" as const,
    left: `${String(Math.round(state.rect.left))}px`,
    top: `${String(Math.round(state.rect.bottom + 6))}px`,
  };

  return createPortal(
    <div
      ref={containerRef}
      className={styles.slashMenu}
      style={style}
      role="dialog"
      aria-label={t.title}
    >
      {screen.kind === "root" ? (
        <RootScreen
          assets={assets}
          collections={collections}
          rootRows={rootRows}
          highlight={highlightIndex}
          onHover={setHighlight}
          onPickAsset={onInsertAsset}
          onPickCollection={openCollection}
          onImport={onImportMedia ? runImport : undefined}
          importing={importing}
          importLabel={t.importMedia}
          emptyLabel={t.empty}
          assetsLabel={t.assetsSection}
          collectionsLabel={t.collectionsSection}
        />
      ) : screen.kind === "records" ? (
        <RecordsScreen
          collection={screen.collection}
          records={library.records.filter((record) => record.collectionId === screen.collection.id)}
          onBack={back}
          onPick={(record) => {
            openConfigure(screen.collection, record);
          }}
        />
      ) : (
        <ConfigureScreen
          collection={screen.collection}
          record={screen.record}
          onBack={back}
          onInsert={(presentation) => {
            onInsertRecord(screen.record, presentation);
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function RootScreen({
  assets,
  collections,
  rootRows,
  highlight,
  onHover,
  onPickAsset,
  onPickCollection,
  onImport,
  importing,
  importLabel,
  emptyLabel,
  assetsLabel,
  collectionsLabel,
}: {
  readonly assets: readonly EditorAsset[];
  readonly collections: readonly EditorCollection[];
  readonly rootRows: readonly (
    | { readonly type: "import" }
    | { readonly type: "asset"; readonly asset: EditorAsset }
    | { readonly type: "collection"; readonly collection: EditorCollection }
  )[];
  readonly highlight: number;
  readonly onHover: (index: number) => void;
  readonly onPickAsset: (asset: EditorAsset) => void;
  readonly onPickCollection: (collection: EditorCollection) => void;
  readonly onImport: (() => void) | undefined;
  readonly importing: boolean;
  readonly importLabel: string;
  readonly emptyLabel: string;
  readonly assetsLabel: string;
  readonly collectionsLabel: string;
}) {
  if (rootRows.length === 0) {
    return <p className={styles.slashEmpty}>{emptyLabel}</p>;
  }
  const importIndex = rootRows.findIndex((row) => row.type === "import");
  const indexOfAsset = (asset: EditorAsset) =>
    rootRows.findIndex((row) => row.type === "asset" && row.asset.id === asset.id);
  const indexOfCollection = (collection: EditorCollection) =>
    rootRows.findIndex((row) => row.type === "collection" && row.collection.id === collection.id);
  return (
    <div className={styles.slashList} role="listbox">
      {onImport ? (
        <button
          type="button"
          role="option"
          aria-selected={importIndex === highlight}
          className={importIndex === highlight ? styles.slashRowActive : styles.slashRow}
          onMouseEnter={() => {
            onHover(importIndex);
          }}
          onClick={onImport}
          disabled={importing}
        >
          <Icon name="upload" size={16} aria-hidden="true" />
          <span className={styles.slashRowLabel}>{importLabel}</span>
        </button>
      ) : null}
      {assets.length > 0 ? (
        <div className={styles.slashSection}>
          <p className={styles.slashSectionLabel}>{assetsLabel}</p>
          {assets.map((asset) => {
            const index = indexOfAsset(asset);
            return (
              <button
                key={asset.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={index === highlight ? styles.slashRowActive : styles.slashRow}
                onMouseEnter={() => {
                  onHover(index);
                }}
                onClick={() => {
                  onPickAsset(asset);
                }}
              >
                <Icon name={ASSET_ICON[asset.kind]} size={16} aria-hidden="true" />
                <span className={styles.slashRowLabel}>{asset.label}</span>
                <span className={styles.slashRowMeta}>{asset.kind}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {collections.length > 0 ? (
        <div className={styles.slashSection}>
          <p className={styles.slashSectionLabel}>{collectionsLabel}</p>
          {collections.map((collection) => {
            const index = indexOfCollection(collection);
            return (
              <button
                key={collection.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={index === highlight ? styles.slashRowActive : styles.slashRow}
                onMouseEnter={() => {
                  onHover(index);
                }}
                onClick={() => {
                  onPickCollection(collection);
                }}
              >
                <Icon name="content" size={16} aria-hidden="true" />
                <span className={styles.slashRowLabel}>{collection.name}</span>
                <Icon name="arrow" size={16} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RecordsScreen({
  collection,
  records,
  onBack,
  onPick,
}: {
  readonly collection: EditorCollection;
  readonly records: readonly EditorRecord[];
  readonly onBack: () => void;
  readonly onPick: (record: EditorRecord) => void;
}) {
  const messages = useMessages();
  const t = messages.lesson.slash;
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const filtered = records.filter(
    (record) =>
      matches(record.label, search) ||
      Object.values(record.fieldText).some((value) => matches(value, search)),
  );
  return (
    <div className={styles.slashPanel}>
      <MenuHeader title={collection.name} onBack={onBack} backLabel={t.back} />
      <input
        ref={inputRef}
        className={styles.slashSearch}
        type="text"
        value={search}
        placeholder={t.searchRecords}
        aria-label={t.searchRecords}
        onChange={(event) => {
          setSearch(event.target.value);
        }}
      />
      <div className={styles.slashList} role="listbox">
        {filtered.length === 0 ? (
          <p className={styles.slashEmpty}>{t.noRecords}</p>
        ) : (
          filtered.map((record) => (
            <button
              key={record.id}
              type="button"
              role="option"
              className={styles.slashRow}
              onClick={() => {
                onPick(record);
              }}
            >
              <span className={styles.slashRowLabel}>{record.label}</span>
              <Icon name="arrow" size={16} aria-hidden="true" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ConfigureScreen({
  collection,
  record,
  onBack,
  onInsert,
}: {
  readonly collection: EditorCollection;
  readonly record: EditorRecord;
  readonly onBack: () => void;
  readonly onInsert: (presentation: EditorPresentation) => void;
}) {
  const messages = useMessages();
  const t = messages.lesson.slash;
  const fields = collection.fields.filter((field) => record.fieldText[field.id] !== undefined);
  const [primaryFieldId, setPrimaryFieldId] = useState(fields[0]?.id ?? "");
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, true])),
  );

  const columnFields = fields.filter((field) => field.id !== primaryFieldId);

  const insert = () => {
    if (!primaryFieldId) return;
    onInsert({
      id: makePresentationId(),
      primaryFieldId,
      columns: columnFields.map((field) => ({
        fieldId: field.id,
        visible: visible[field.id] ?? true,
      })),
    });
  };

  return (
    <div className={styles.slashPanel}>
      <MenuHeader title={record.label} onBack={onBack} backLabel={t.back} />
      <p className={styles.slashSectionLabel}>{t.primaryLabel}</p>
      <RadioChoices
        aria-label={t.primaryLabel}
        value={primaryFieldId}
        onValueChange={setPrimaryFieldId}
      >
        <div className={styles.slashList}>
          {fields.map((field) => (
            <RadioChoice key={field.id} className={styles.slashChoice} value={field.id}>
              <span className={styles.slashRowLabel}>{field.name}</span>
              <span className={styles.slashRowMeta}>{record.fieldText[field.id]}</span>
            </RadioChoice>
          ))}
        </div>
      </RadioChoices>
      {columnFields.length > 0 ? (
        <>
          <p className={styles.slashSectionLabel}>{t.columnsLabel}</p>
          <div className={styles.slashList}>
            {columnFields.map((field) => (
              <CheckChoice
                key={field.id}
                className={styles.slashChoice}
                checked={visible[field.id] ?? true}
                onCheckedChange={(checked) => {
                  setVisible((current) => ({ ...current, [field.id]: checked }));
                }}
              >
                <span className={styles.slashRowLabel}>{field.name}</span>
                <span className={styles.slashRowMeta}>{record.fieldText[field.id]}</span>
              </CheckChoice>
            ))}
          </div>
        </>
      ) : null}
      <button
        type="button"
        className={styles.slashInsert}
        onClick={insert}
        disabled={!primaryFieldId}
      >
        {t.insert}
      </button>
    </div>
  );
}

function MenuHeader({
  title,
  onBack,
  backLabel,
}: {
  readonly title: string;
  readonly onBack: () => void;
  readonly backLabel: string;
}) {
  return (
    <div className={styles.slashHeader}>
      <button type="button" className={styles.slashBack} aria-label={backLabel} onClick={onBack}>
        <Icon name="back" size={16} aria-hidden="true" />
      </button>
      <span className={styles.slashHeaderTitle}>{title}</span>
    </div>
  );
}
