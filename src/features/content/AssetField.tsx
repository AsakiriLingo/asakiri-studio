import { useEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import type { Asset, FieldDefinition, RecordFieldItem, RecordFieldValue } from "@core/course";
import { useFormat, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { ScrollArea } from "@shared/components/scroll-area";
import type { SelectOption } from "@shared/components/select";
import styles from "@features/content/CourseContent.module.css";

export type ImportAsset = () => Promise<Asset | null>;

export type LoadPreview = (assetId: string) => Promise<string | null>;

const previewCache = new Map<string, Promise<string | null>>();

function assetOptions(assets: readonly Asset[], assetKind?: Asset["kind"]): SelectOption[] {
  return assets
    .filter((asset) => assetKind === undefined || asset.kind === assetKind)
    .map((asset) => ({ value: asset.id, label: asset.file ?? asset.label }));
}

function useAssetPreview(asset: Asset | undefined, loadPreview: LoadPreview): string | null {
  const [loaded, setLoaded] = useState<{ readonly id: string; readonly url: string } | null>(null);
  const loadRef = useRef(loadPreview);
  useEffect(() => {
    loadRef.current = loadPreview;
  });

  const previewable =
    asset?.kind === "image" && asset.availability === "ready" && asset.file ? asset.id : null;

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    let promise = previewCache.get(previewable);
    if (!promise) {
      promise = loadRef.current(previewable);
      previewCache.set(previewable, promise);
    }
    void promise.then((url) => {
      if (!cancelled && url) setLoaded({ id: previewable, url });
    });
    return () => {
      cancelled = true;
    };
  }, [previewable]);

  return loaded?.id === previewable ? loaded.url : null;
}

function AudioPreviewButton({
  assetId,
  loadPreview,
}: {
  readonly assetId: string;
  readonly loadPreview: LoadPreview;
}) {
  const messages = useMessages();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  const toggle = async () => {
    const existing = audioRef.current;
    if (existing) {
      if (existing.paused) {
        void existing.play();
      } else {
        existing.pause();
        existing.currentTime = 0;
      }
      return;
    }
    const url = await loadPreview(assetId);
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("play", () => {
      setPlaying(true);
    });
    audio.addEventListener("pause", () => {
      setPlaying(false);
    });
    audio.addEventListener("ended", () => {
      setPlaying(false);
    });
    void audio.play();
  };

  return (
    <button
      type="button"
      className={styles.audioPlay}
      aria-label={playing ? messages.common.stop : messages.common.play}
      onClick={() => {
        void toggle();
      }}
    >
      <Icon name={playing ? "stop" : "play"} size={16} />
    </button>
  );
}

export function AssetPreview({
  asset,
  loadPreview,
  size = 20,
}: {
  readonly asset: Asset | undefined;
  readonly loadPreview: LoadPreview;
  readonly size?: number;
}) {
  const url = useAssetPreview(asset, loadPreview);
  if (asset?.kind === "audio") {
    return <AudioPreviewButton assetId={asset.id} loadPreview={loadPreview} />;
  }
  if (url) {
    return (
      <img
        className={styles.thumb}
        style={{ width: size, height: size }}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <Icon name={asset ? asset.kind : "image"} size={size} />;
}

function PickerItemThumb({
  asset,
  loadPreview,
}: {
  readonly asset: Asset | undefined;
  readonly loadPreview: LoadPreview;
}) {
  const url = useAssetPreview(asset, loadPreview);
  if (asset?.kind === "image" && url) {
    return (
      <img
        className={styles.pickerItemThumb}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    );
  }
  return (
    <span className={styles.pickerItemThumbFallback}>
      <Icon name={asset ? asset.kind : "image"} size={16} aria-hidden="true" />
    </span>
  );
}

function AssetPicker({
  options,
  assets,
  loadPreview,
  ariaLabel,
  onPick,
  onImport,
}: {
  readonly options: readonly SelectOption[];
  readonly assets: readonly Asset[];
  readonly loadPreview: LoadPreview;
  readonly ariaLabel: string;
  readonly onPick: (assetId: string) => void;
  readonly onImport: () => void;
}) {
  const messages = useMessages();
  const t = messages.content;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.addAsset} aria-label={ariaLabel}>
        <Icon name="plus" size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={styles.pickerPositioner} sideOffset={4} align="start">
          <Popover.Popup className={styles.pickerPopup}>
            <div className={styles.pickerSearch}>
              <Icon
                name="search"
                size={16}
                className={styles.pickerSearchIcon}
                aria-hidden="true"
              />
              <input
                type="search"
                className={styles.pickerInput}
                value={query}
                placeholder={messages.common.searchPlaceholder}
                aria-label={messages.common.search}
                autoComplete="off"
                autoFocus
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                }}
              />
            </div>
            <ScrollArea
              viewportClassName={styles.pickerScrollViewport}
              contentClassName={styles.pickerList}
              contentStyle={{ minWidth: 0 }}
            >
              {filtered.length === 0 ? (
                <p className={styles.pickerEmpty}>{messages.common.noResults}</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => {
                      close();
                      onPick(option.value);
                    }}
                  >
                    <PickerItemThumb asset={byId.get(option.value)} loadPreview={loadPreview} />
                    <span className={styles.pickerItemLabel}>{option.label}</span>
                  </button>
                ))
              )}
            </ScrollArea>
            <button
              type="button"
              className={styles.pickerImport}
              onClick={() => {
                close();
                onImport();
              }}
            >
              <Icon name="upload" size={16} />
              {t.importNewFile}
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface AssetControlProps {
  readonly value: RecordFieldValue | undefined;
  readonly field: FieldDefinition;
  readonly assets: readonly Asset[];
  readonly importAsset: ImportAsset;
  readonly loadPreview: LoadPreview;
  readonly onChange: (value: RecordFieldValue) => void;
}

export function AssetFieldControl({
  value,
  field,
  assets,
  importAsset,
  loadPreview,
  onChange,
}: AssetControlProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.content;
  const assetId = value?.kind === "asset" ? value.assetId : "";
  const asset = assetId ? assets.find((entry) => entry.id === assetId) : undefined;

  const setAsset = (nextId: string) => {
    onChange({ kind: "asset", assetId: nextId });
  };
  const importNew = () => {
    void importAsset().then((created) => {
      if (created) setAsset(created.id);
    });
  };

  if (assetId) {
    const label = asset ? (asset.file ?? asset.label) : t.missing;
    return (
      <span className={styles.assetChip}>
        <AssetPreview asset={asset} loadPreview={loadPreview} size={40} />
        <span className={styles.chipLabel}>{label}</span>
        <button
          type="button"
          className={styles.chipRemove}
          aria-label={format(messages.common.remove, { label })}
          onClick={() => {
            setAsset("");
          }}
        >
          <Icon name="trash" size={12} />
        </button>
      </span>
    );
  }

  return (
    <AssetPicker
      options={assetOptions(assets, field.assetKind)}
      assets={assets}
      loadPreview={loadPreview}
      ariaLabel={field.name || t.linkAsset}
      onPick={setAsset}
      onImport={importNew}
    />
  );
}

export function AssetListFieldControl({
  value,
  field,
  assets,
  importAsset,
  loadPreview,
  onChange,
}: AssetControlProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.content;
  const items = value?.kind === "list" ? value.items : [];
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const assetItems = items.filter(
    (item): item is Extract<RecordFieldItem, { kind: "asset" }> => item.kind === "asset",
  );

  const append = (assetId: string) => {
    onChange({
      kind: "list",
      items: [...items, { id: `item_${crypto.randomUUID()}`, kind: "asset", assetId }],
    });
  };
  const importNew = () => {
    void importAsset().then((created) => {
      if (created) append(created.id);
    });
  };

  return (
    <span className={styles.cellEditor}>
      {assetItems.map((item) => {
        const asset = byId.get(item.assetId);
        const label = asset ? (asset.file ?? asset.label) : t.missing;
        return (
          <span key={item.id} className={styles.assetChip}>
            <AssetPreview asset={asset} loadPreview={loadPreview} size={40} />
            <span className={styles.chipLabel}>{label}</span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={format(messages.common.remove, { label })}
              onClick={() => {
                onChange({ kind: "list", items: items.filter((entry) => entry.id !== item.id) });
              }}
            >
              <Icon name="trash" size={12} />
            </button>
          </span>
        );
      })}
      <AssetPicker
        options={assetOptions(assets, field.assetKind)}
        assets={assets}
        loadPreview={loadPreview}
        ariaLabel={field.name || t.linkAsset}
        onPick={append}
        onImport={importNew}
      />
    </span>
  );
}
