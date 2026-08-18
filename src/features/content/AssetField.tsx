import { useEffect, useRef, useState } from "react";
import type { Asset, FieldDefinition, RecordFieldItem, RecordFieldValue } from "@core/course";
import { useFormat, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { Select, type SelectOption } from "@shared/components/select";
import styles from "@features/content/CourseContent.module.css";

export type ImportAsset = () => Promise<Asset | null>;

export type LoadPreview = (assetId: string) => Promise<string | null>;

const IMPORT = "__import__";
const CLEAR = "__clear__";

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
  if (url) {
    return <img className={styles.thumb} src={url} alt="" loading="lazy" decoding="async" />;
  }
  return <Icon name={asset ? asset.kind : "image"} size={size} />;
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
  const t = useMessages().content;
  const [importing, setImporting] = useState(false);
  const assetId = value?.kind === "asset" ? value.assetId : "";
  const asset = assetId ? assets.find((entry) => entry.id === assetId) : undefined;

  const items: SelectOption[] = [
    ...assetOptions(assets, field.assetKind),
    ...(assetId && !asset ? [{ value: assetId, label: t.missing }] : []),
    { value: IMPORT, label: t.importNewFile },
    ...(assetId ? [{ value: CLEAR, label: t.clearAsset }] : []),
  ];

  const choose = (next: string) => {
    if (next === "") return;
    if (next === CLEAR) {
      onChange({ kind: "asset", assetId: "" });
      return;
    }
    if (next === IMPORT) {
      setImporting(true);
      void importAsset()
        .then((created) => {
          if (created) onChange({ kind: "asset", assetId: created.id });
        })
        .finally(() => {
          setImporting(false);
        });
      return;
    }
    onChange({ kind: "asset", assetId: next });
  };

  return (
    <span className={styles.assetControl}>
      {assetId ? <AssetPreview asset={asset} loadPreview={loadPreview} /> : null}
      <Select
        searchable
        aria-label={field.name || t.linkAsset}
        placeholder={importing ? t.importing : t.chooseAsset}
        items={items}
        value={assetId}
        onValueChange={choose}
      />
    </span>
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
  const [importing, setImporting] = useState(false);
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

  const add = (next: string) => {
    if (next === "") return;
    if (next === IMPORT) {
      setImporting(true);
      void importAsset()
        .then((created) => {
          if (created) append(created.id);
        })
        .finally(() => {
          setImporting(false);
        });
      return;
    }
    append(next);
  };

  return (
    <span className={styles.cellEditor}>
      {assetItems.map((item) => {
        const asset = byId.get(item.assetId);
        const label = asset ? (asset.file ?? asset.label) : t.missing;
        return (
          <span key={item.id} className={styles.assetChip}>
            <AssetPreview asset={asset} loadPreview={loadPreview} size={16} />
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
      <Select
        searchable
        aria-label={field.name || t.linkAsset}
        placeholder={importing ? t.importing : t.addItem}
        items={[
          ...assetOptions(assets, field.assetKind),
          { value: IMPORT, label: t.importNewFile },
        ]}
        value=""
        onValueChange={add}
      />
    </span>
  );
}
