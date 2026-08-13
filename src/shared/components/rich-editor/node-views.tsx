import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Icon } from "@shared/components/icon";
import { useAssetPreview, useRichEditorLibrary } from "@shared/components/rich-editor/context";
import type { EditorFieldAsset } from "@shared/components/rich-editor/library";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

interface RecordBinding {
  readonly kind?: string;
  readonly recordId?: string;
}

interface ContentRecordAttrs {
  readonly binding: RecordBinding | null;
  readonly presentation: string | null;
  readonly label: string | null;
}

export function ContentRecordView({ node }: NodeViewProps) {
  const attrs = node.attrs as ContentRecordAttrs;
  const library = useRichEditorLibrary();

  const recordId = attrs.binding?.recordId;
  const record = recordId ? library.records.find((entry) => entry.id === recordId) : undefined;
  const collection = record
    ? library.collections.find((entry) => entry.id === record.collectionId)
    : undefined;
  const presentation = record?.presentations.find((entry) => entry.id === attrs.presentation);

  const fieldName = (fieldId: string) =>
    collection?.fields.find((field) => field.id === fieldId)?.name ?? fieldId;

  const primaryText =
    record && presentation ? record.fieldText[presentation.primaryFieldId] : undefined;
  const label = primaryText ?? attrs.label ?? "Content record";

  const columns = (presentation?.columns.filter((column) => column.visible) ?? [])
    .map((column) => ({
      id: column.fieldId,
      name: fieldName(column.fieldId),
      value: record?.fieldText[column.fieldId],
      assets: record?.fieldAssets[column.fieldId] ?? [],
    }))
    .filter((column) => Boolean(column.value) || column.assets.length > 0);

  return (
    <NodeViewWrapper as="span" className={styles.reference} data-drag-handle>
      <span className={styles.referenceText} tabIndex={0}>
        {label}
      </span>
      {columns.length > 0 ? (
        <span className={styles.referencePopover} role="tooltip">
          {columns.map((column) => (
            <span key={column.id} className={styles.referenceRow}>
              <span className={styles.referenceRowName}>{column.name}</span>
              {column.assets.length > 0 ? (
                <span className={styles.referenceMedia}>
                  {column.assets.map((asset) => (
                    <AssetInline key={asset.assetId} asset={asset} />
                  ))}
                </span>
              ) : (
                <span className={styles.referenceRowValue}>{column.value}</span>
              )}
            </span>
          ))}
        </span>
      ) : null}
    </NodeViewWrapper>
  );
}

function AssetInline({ asset }: { readonly asset: EditorFieldAsset }) {
  const url = useAssetUrl(asset.assetId, null);
  if (asset.kind === "audio") return <AudioButton url={url} label={asset.label} />;
  if (!url) return <span className={styles.referenceRowValue}>{asset.label}</span>;
  if (asset.kind === "video") return <video className={styles.referenceVideo} controls src={url} />;
  return <img className={styles.referenceImage} src={url} alt={asset.label} />;
}

function AudioButton({ url, label }: { readonly url: string | null; readonly label: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const element = audioRef.current;
    if (!element) return;
    if (playing) {
      element.pause();
      element.currentTime = 0;
      setPlaying(false);
    } else {
      setPlaying(true);
      void element.play().catch(() => {
        setPlaying(false);
      });
    }
  };

  return (
    <span className={styles.audioControl}>
      <button
        type="button"
        className={styles.audioToggle}
        aria-label={playing ? `Stop ${label}` : `Play ${label}`}
        onClick={toggle}
        disabled={!url}
      >
        <Icon name={playing ? "stop" : "play"} size={16} aria-hidden="true" />
      </button>
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          hidden
          onEnded={() => {
            setPlaying(false);
          }}
        />
      ) : null}
    </span>
  );
}

interface MediaAttrs {
  readonly src: string | null;
  readonly label: string | null;
  readonly assetId: string | null;
  readonly alt?: string | null;
}

const DIRECT_URL = /^(https?:|data:|blob:)/;

function useAssetUrl(assetId: string | null, src: string | null): string | null {
  const loadAssetPreview = useAssetPreview();
  const direct = src && DIRECT_URL.test(src) ? src : null;
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (direct || !assetId) return;
    let active = true;
    void loadAssetPreview(assetId).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [direct, assetId, loadAssetPreview]);

  return direct ?? loaded;
}

function MediaPlaceholder({
  kind,
  label,
}: {
  readonly kind: "audio" | "video" | "image";
  readonly label: string;
}) {
  return (
    <span className={styles.mediaPlaceholder}>
      <Icon name={kind} size={18} aria-hidden="true" />
      {label}
    </span>
  );
}

export function AudioView({ node }: NodeViewProps) {
  const attrs = node.attrs as MediaAttrs;
  const url = useAssetUrl(attrs.assetId, attrs.src);
  return (
    <NodeViewWrapper className={styles.mediaBlock} data-drag-handle>
      <AudioButton url={url} label={attrs.label ?? "Audio"} />
    </NodeViewWrapper>
  );
}

export function VideoView({ node }: NodeViewProps) {
  const attrs = node.attrs as MediaAttrs;
  const url = useAssetUrl(attrs.assetId, attrs.src);
  return (
    <NodeViewWrapper className={styles.mediaBlock} data-drag-handle>
      {url ? (
        <video className={styles.video} controls src={url} />
      ) : (
        <MediaPlaceholder kind="video" label={attrs.label ?? "Video"} />
      )}
    </NodeViewWrapper>
  );
}

export function ImageView({ node }: NodeViewProps) {
  const attrs = node.attrs as MediaAttrs;
  const url = useAssetUrl(attrs.assetId, attrs.src);
  return (
    <NodeViewWrapper className={styles.mediaBlock} data-drag-handle>
      {url ? (
        <img className={styles.image} src={url} alt={attrs.alt ?? ""} />
      ) : (
        <MediaPlaceholder kind="image" label={attrs.label ?? attrs.alt ?? "Image"} />
      )}
    </NodeViewWrapper>
  );
}
