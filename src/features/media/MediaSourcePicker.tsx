import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import type { Asset, AssetKind } from "@core/course";
import type { AudioSearchResult, ImageSearchResult, SearchPage } from "@core/media-search";
import type { CatalogVoice, TtsVoice } from "@core/tts";
import { useMessages } from "@shared/i18n";
import { Icon, type IconName } from "@shared/components/icon";
import { ScrollArea } from "@shared/components/scroll-area";
import { MediaSearchDialog } from "@features/media/MediaSearchDialog";
import { TtsDialog } from "@features/media/TtsDialog";
import { RecordDialog } from "@features/media/RecordDialog";
import styles from "@features/media/MediaSourcePicker.module.css";

export type LoadAssetPreview = (assetId: string) => Promise<string | null>;

export type TtsAddResult =
  { readonly ok: true; readonly asset: Asset } | { readonly ok: false; readonly error: string };

export interface MediaAuthoringCapability {
  readonly importFromDevice: () => Promise<Asset | null>;
  readonly searchImages: (query: string, page: number) => Promise<SearchPage<ImageSearchResult>>;
  readonly searchAudio: (query: string, page: number) => Promise<SearchPage<AudioSearchResult>>;
  readonly addRemoteMedia: (
    url: string,
    fileName: string,
    metadata: Readonly<Record<string, unknown>>,
  ) => Promise<Asset | null>;
  readonly defaultTtsVoice: string;
  readonly onDefaultTtsVoiceChange: (voice: string) => void;
  readonly listTtsVoices: () => Promise<readonly TtsVoice[]>;
  readonly previewTtsVoice: (text: string, voice: string) => Promise<string>;
  readonly listAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly downloadVoice: (
    voiceId: string,
    onProgress?: (downloaded: number, total: number) => void,
  ) => Promise<boolean>;
  readonly removeVoice: (voiceId: string) => Promise<boolean>;
  readonly addTtsAudio: (text: string, voice: string, fileName: string) => Promise<TtsAddResult>;
  readonly addRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
  ) => Promise<Asset | null>;
}

export interface MediaSourcePickerProps {
  readonly assets: readonly Asset[];
  readonly assetKind?: AssetKind | undefined;
  readonly multiple?: boolean;
  readonly ariaLabel: string;
  readonly loadPreview: LoadAssetPreview;
  readonly onPick: (assetId: string) => void;
  readonly capability: MediaAuthoringCapability;
}

type DialogKind = "images" | "audio" | "tts" | "record";

function ItemThumb({
  asset,
  loadPreview,
}: {
  readonly asset: Asset;
  readonly loadPreview: LoadAssetPreview;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const previewable =
    asset.kind === "image" && asset.availability === "ready" && Boolean(asset.file);

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    void loadPreview(asset.id).then((next) => {
      if (!cancelled && next) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id, previewable, loadPreview]);

  if (url) {
    return (
      <img
        className={styles.thumb}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    );
  }
  return (
    <span className={styles.thumbFallback}>
      <Icon name={asset.kind} size={16} aria-hidden="true" />
    </span>
  );
}

export function MediaSourcePicker({
  assets,
  assetKind,
  multiple = false,
  ariaLabel,
  loadPreview,
  onPick,
  capability,
}: MediaSourcePickerProps) {
  const messages = useMessages();
  const t = messages.media;
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [query, setQuery] = useState("");

  const closeAll = () => {
    setOpen(false);
    setDialog(null);
    setQuery("");
  };

  const picked = (asset: Asset) => {
    onPick(asset.id);
    if (!multiple) closeAll();
  };

  const runDeviceImport = () => {
    void capability.importFromDevice().then((asset) => {
      if (asset) picked(asset);
    });
  };

  const openDialog = (kind: DialogKind) => {
    setDialog(kind);
    setOpen(false);
  };

  const matches = assets.filter((asset) => {
    if (assetKind !== undefined && asset.kind !== assetKind) return false;
    const q = query.trim().toLowerCase();
    if (q === "") return true;
    return `${asset.file ?? ""} ${asset.label}`.toLowerCase().includes(q);
  });

  const sources: readonly { key: string; icon: IconName; label: string; run: () => void }[] = [
    { key: "device", icon: "upload", label: t.importFromDevice, run: runDeviceImport },
    ...(assetKind === undefined || assetKind === "image"
      ? [
          {
            key: "images",
            icon: "image" as IconName,
            label: t.searchUnsplashImages,
            run: () => {
              openDialog("images");
            },
          },
        ]
      : []),
    ...(assetKind === undefined || assetKind === "audio"
      ? [
          {
            key: "audio",
            icon: "audio" as IconName,
            label: t.searchTatoebaAudio,
            run: () => {
              openDialog("audio");
            },
          },
          {
            key: "tts",
            icon: "audio" as IconName,
            label: t.addTts,
            run: () => {
              openDialog("tts");
            },
          },
          {
            key: "record",
            icon: "mic" as IconName,
            label: t.recordAudio,
            run: () => {
              openDialog("record");
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className={styles.trigger} aria-label={ariaLabel}>
          <Icon name="plus" size={16} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner className={styles.positioner} sideOffset={4} align="start">
            <Popover.Popup className={styles.popup}>
              <div className={styles.search}>
                <Icon name="search" size={16} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="search"
                  className={styles.input}
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
              <ScrollArea viewportClassName={styles.viewport} contentClassName={styles.list}>
                {matches.length === 0 ? (
                  <p className={styles.empty}>{messages.common.noResults}</p>
                ) : (
                  matches.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className={styles.item}
                      onClick={() => {
                        picked(asset);
                      }}
                    >
                      <ItemThumb asset={asset} loadPreview={loadPreview} />
                      <span className={styles.itemLabel}>{asset.file ?? asset.label}</span>
                    </button>
                  ))
                )}
              </ScrollArea>
              <div className={styles.sources}>
                <span className={styles.sourcesLabel}>{t.addMedia}</span>
                {sources.map((source) => (
                  <button
                    key={source.key}
                    type="button"
                    className={styles.source}
                    onClick={source.run}
                  >
                    <Icon name={source.icon} size={16} className={styles.sourceIcon} />
                    {source.label}
                  </button>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {dialog === "images" || dialog === "audio" ? (
        <MediaSearchDialog
          mode={dialog}
          onClose={() => {
            setDialog(null);
          }}
          onSearchImages={capability.searchImages}
          onSearchAudio={capability.searchAudio}
          onAddRemoteMedia={async (url, fileName, metadata) => {
            const asset = await capability.addRemoteMedia(url, fileName, metadata);
            if (asset) picked(asset);
            return asset ? { status: "saved" } : { status: "failed", code: "unknown" };
          }}
        />
      ) : null}

      {dialog === "tts" ? (
        <TtsDialog
          onClose={() => {
            setDialog(null);
          }}
          defaultVoice={capability.defaultTtsVoice}
          onDefaultVoiceChange={capability.onDefaultTtsVoiceChange}
          onListVoices={capability.listTtsVoices}
          onPreviewVoice={capability.previewTtsVoice}
          onListAvailableVoices={capability.listAvailableVoices}
          onDownloadVoice={capability.downloadVoice}
          onRemoveVoice={capability.removeVoice}
          onAddTtsAudio={async (text, voice, fileName) => {
            const result = await capability.addTtsAudio(text, voice, fileName);
            if (result.ok) picked(result.asset);
            return result;
          }}
        />
      ) : null}

      {dialog === "record" ? (
        <RecordDialog
          onClose={() => {
            setDialog(null);
          }}
          onAddRecording={async (bytes, mimeType, ext) => {
            const asset = await capability.addRecording(bytes, mimeType, ext);
            if (asset) picked(asset);
            return asset ? { status: "saved" } : null;
          }}
        />
      ) : null}
    </>
  );
}
