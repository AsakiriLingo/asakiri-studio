import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CheckChoice, RadioChoice, RadioChoices } from "@shared/components/choice";
import { Icon, type IconName } from "@shared/components/icon";
import { useAssetPreview } from "@shared/components/rich-editor/context";
import { ScrollArea } from "@shared/components/scroll-area";
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

const DIRECT_URL = /^(https?:|data:|blob:)/;

function useAssetThumbUrl(asset: EditorAsset): string | null {
  const loadAssetPreview = useAssetPreview();
  const direct = asset.file && DIRECT_URL.test(asset.file) ? asset.file : null;
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (direct || asset.kind !== "image") return;
    let active = true;
    void loadAssetPreview(asset.id).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [direct, asset.id, asset.kind, loadAssetPreview]);

  return direct ?? loaded;
}

function AssetThumb({ asset }: { readonly asset: EditorAsset }) {
  const url = useAssetThumbUrl(asset);
  if (asset.kind === "image" && url) {
    return <img className={styles.slashThumb} src={url} alt="" aria-hidden="true" />;
  }
  return (
    <span className={styles.slashThumbFallback}>
      <Icon name={ASSET_ICON[asset.kind]} size={16} aria-hidden="true" />
    </span>
  );
}

const MENU_GAP = 6;
const MENU_MARGIN = 12;
const MENU_MAX_HEIGHT = 352;

function placementStyle(rect: DOMRect): CSSProperties {
  const viewport = typeof window !== "undefined" ? window.innerHeight : 0;
  const left = Math.round(rect.left);
  if (viewport === 0) {
    return {
      position: "fixed",
      left: `${String(left)}px`,
      top: `${String(Math.round(rect.bottom + MENU_GAP))}px`,
    };
  }
  const spaceBelow = viewport - rect.bottom - MENU_GAP - MENU_MARGIN;
  const spaceAbove = rect.top - MENU_GAP - MENU_MARGIN;
  const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
  const available = Math.max(160, Math.floor(openUp ? spaceAbove : spaceBelow));
  const maxHeight = `${String(Math.min(MENU_MAX_HEIGHT, available))}px`;
  return openUp
    ? {
        position: "fixed",
        left: `${String(left)}px`,
        bottom: `${String(Math.round(viewport - rect.top + MENU_GAP))}px`,
        maxHeight,
      }
    : {
        position: "fixed",
        left: `${String(left)}px`,
        top: `${String(Math.round(rect.bottom + MENU_GAP))}px`,
        maxHeight,
      };
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
  const [search, setSearch] = useState(state.query);

  const searching = search.trim() !== "";

  const assets = useMemo(
    () => (searching ? library.assets.filter((asset) => matches(asset.label, search)) : []),
    [library.assets, search, searching],
  );
  const collections = useMemo(
    () => library.collections.filter((collection) => matches(collection.name, search)),
    [library.collections, search],
  );

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setHighlight(0);
  }, []);

  const rootRows = useMemo(
    () => [
      ...(onImportMedia ? [{ type: "import" as const }] : []),
      ...collections.map((collection) => ({ type: "collection" as const, collection })),
      ...assets.map((asset) => ({ type: "asset" as const, asset })),
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

  const style = placementStyle(state.rect);

  return createPortal(
    <div
      ref={containerRef}
      className={styles.slashMenu}
      style={style}
      role="dialog"
      aria-label={t.title}
    >
      <ScrollArea
        className={styles.slashScroll}
        viewportClassName={styles.slashScrollViewport}
        contentClassName={styles.slashScrollContent}
        contentStyle={{ minWidth: 0 }}
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
            search={search}
            searching={searching}
            onSearchChange={changeSearch}
            searchLabel={t.searchLibrary}
          />
        ) : screen.kind === "records" ? (
          <RecordsScreen
            collection={screen.collection}
            records={library.records.filter(
              (record) => record.collectionId === screen.collection.id,
            )}
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
      </ScrollArea>
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
  search,
  searching,
  onSearchChange,
  searchLabel,
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
  readonly search: string;
  readonly searching: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly searchLabel: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    searchRef.current?.focus();
  }, []);
  const importIndex = rootRows.findIndex((row) => row.type === "import");
  const indexOfAsset = (asset: EditorAsset) =>
    rootRows.findIndex((row) => row.type === "asset" && row.asset.id === asset.id);
  const indexOfCollection = (collection: EditorCollection) =>
    rootRows.findIndex((row) => row.type === "collection" && row.collection.id === collection.id);
  return (
    <div className={styles.slashPanel}>
      <input
        ref={searchRef}
        className={styles.slashSearch}
        type="text"
        value={search}
        placeholder={searchLabel}
        aria-label={searchLabel}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
      />
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
                  <AssetThumb asset={asset} />
                  <span className={styles.slashRowLabel}>{asset.label}</span>
                  <span className={styles.slashRowMeta}>{asset.kind}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {searching && assets.length === 0 && collections.length === 0 ? (
          <p className={styles.slashEmpty}>{emptyLabel}</p>
        ) : null}
      </div>
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
