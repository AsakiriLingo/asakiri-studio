import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  Asset,
  AssetKind,
  FieldDefinition,
  RecordFieldItem,
  RecordFieldValue,
} from "@core/course";
import { useFormat, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import styles from "@features/content/CourseContent.module.css";

export type LoadPreview = (assetId: string) => Promise<string | null>;

export interface AssetPickerRequest {
  readonly assetKind?: AssetKind | undefined;
  readonly multiple: boolean;
  readonly ariaLabel: string;
  readonly onPick: (assetId: string) => void;
}

export type RenderAssetPicker = (request: AssetPickerRequest) => ReactNode;

const previewCache = new Map<string, Promise<string | null>>();

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

interface AssetControlProps {
  readonly value: RecordFieldValue | undefined;
  readonly field: FieldDefinition;
  readonly assets: readonly Asset[];
  readonly renderAssetPicker: RenderAssetPicker;
  readonly loadPreview: LoadPreview;
  readonly onChange: (value: RecordFieldValue) => void;
}

export function AssetFieldControl({
  value,
  field,
  assets,
  renderAssetPicker,
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

  return renderAssetPicker({
    assetKind: field.assetKind,
    multiple: false,
    ariaLabel: field.name || t.linkAsset,
    onPick: setAsset,
  });
}

export function AssetListFieldControl({
  value,
  field,
  assets,
  renderAssetPicker,
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
      {renderAssetPicker({
        assetKind: field.assetKind,
        multiple: true,
        ariaLabel: field.name || t.linkAsset,
        onPick: append,
      })}
    </span>
  );
}
