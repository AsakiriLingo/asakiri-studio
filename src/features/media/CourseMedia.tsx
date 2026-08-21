import { useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import type { Asset, ContentRecord, Course } from "@core/course";
import type { AudioSearchResult, ImageSearchResult, SearchPage } from "@core/media-search";
import type { ProjectWriteResult } from "@core/project-writing";
import type { CatalogVoice, DownloadProgress, TtsSaveResult, TtsVoice } from "@core/tts";
import { useFormat, useMessages, type StudioMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Status } from "@shared/components/status";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import { MediaSearchDialog, type MediaSearchMode } from "@features/media/MediaSearchDialog";
import { TtsDialog } from "@features/media/TtsDialog";
import { RecordDialog } from "@features/media/RecordDialog";
import styles from "@features/media/CourseMedia.module.css";

const PAGE_SIZE = 24;

function referencedAssetIds(record: ContentRecord): string[] {
  const ids: string[] = [];
  for (const value of Object.values(record.fields)) {
    if (value.kind === "asset") {
      ids.push(value.assetId);
    } else if (value.kind === "list") {
      for (const item of value.items) {
        if (item.kind === "asset") ids.push(item.assetId);
      }
    }
  }
  return ids;
}

function assetName(asset: Asset): string {
  return asset.file ?? asset.expectedFile ?? asset.label;
}

function matchesQuery(asset: Asset, query: string): boolean {
  const haystack =
    `${assetName(asset)} ${asset.label} ${asset.kind} ${asset.mimeType}`.toLowerCase();
  return haystack.includes(query);
}

function scrollParentOf(element: Element | null): Element | null {
  let node = element?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

export interface CourseMediaProps {
  readonly course: Course;
  readonly onImportMedia: () => Promise<ProjectWriteResult | null>;
  readonly onImportMediaFolder: () => Promise<ProjectWriteResult | null>;
  readonly onDeleteAsset: (assetId: string) => Promise<ProjectWriteResult>;
  readonly onLoadPreview: (assetId: string) => Promise<string | null>;
  readonly onSearchImages: (query: string, page: number) => Promise<SearchPage<ImageSearchResult>>;
  readonly onSearchAudio: (query: string, page: number) => Promise<SearchPage<AudioSearchResult>>;
  readonly onAddRemoteMedia: (
    url: string,
    fileName: string,
    metadata: Readonly<Record<string, unknown>>,
  ) => Promise<ProjectWriteResult | null>;
  readonly onRenameAsset: (assetId: string, name: string) => Promise<ProjectWriteResult>;
  readonly onListTtsVoices: () => Promise<readonly TtsVoice[]>;
  readonly onPreviewTtsVoice: (text: string, voice: string) => Promise<string>;
  readonly onListAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly onDownloadVoice: (voiceId: string, onProgress?: DownloadProgress) => Promise<boolean>;
  readonly onRemoveVoice: (voiceId: string) => Promise<boolean>;
  readonly onAddTtsAudio: (text: string, voice: string, fileName: string) => Promise<TtsSaveResult>;
  readonly onAddRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
  ) => Promise<ProjectWriteResult | null>;
}

export function CourseMedia({
  course,
  onImportMedia,
  onImportMediaFolder,
  onDeleteAsset,
  onLoadPreview,
  onSearchImages,
  onSearchAudio,
  onAddRemoteMedia,
  onRenameAsset,
  onListTtsVoices,
  onPreviewTtsVoice,
  onListAvailableVoices,
  onDownloadVoice,
  onRemoveVoice,
  onAddTtsAudio,
  onAddRecording,
}: CourseMediaProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.media;
  const confirm = useConfirm();
  const [importing, setImporting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "failed">("idle");
  const [query, setQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [searchMode, setSearchMode] = useState<MediaSearchMode | null>(null);
  const [showTts, setShowTts] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Asset | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSettledQuery(query.trim().toLowerCase());
    }, 250);
    return () => {
      clearTimeout(handle);
    };
  }, [query]);

  const loadRef = useRef(onLoadPreview);
  useEffect(() => {
    loadRef.current = onLoadPreview;
  });

  const kindLabel: Record<Asset["kind"], string> = {
    audio: t.kindAudio,
    image: t.kindImage,
    video: t.kindVideo,
  };

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of course.records) {
      for (const assetId of referencedAssetIds(record)) {
        counts.set(assetId, (counts.get(assetId) ?? 0) + 1);
      }
    }
    return counts;
  }, [course.records]);

  const filtered = useMemo(() => {
    if (!settledQuery) return course.assets;
    return course.assets.filter((asset) => matchesQuery(asset, settledQuery));
  }, [course.assets, settledQuery]);

  if (settledQuery !== lastQuery) {
    setLastQuery(settledQuery);
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const requested = useRef<Set<string>>(new Set());
  const visibleImageIds = visible
    .filter((asset) => asset.kind === "image" && asset.availability === "ready" && asset.file)
    .map((asset) => asset.id)
    .join(",");
  useEffect(() => {
    let cancelled = false;
    for (const id of visibleImageIds.split(",").filter(Boolean)) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      void loadRef.current(id).then((url) => {
        if (!cancelled && url) setPreviews((prev) => ({ ...prev, [id]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [visibleImageIds]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
        }
      },
      { root: scrollParentOf(sentinel), rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, filtered.length]);

  const runFolderImport = () => {
    setImporting(true);
    void onImportMediaFolder()
      .then((result) => {
        if (result) setSaveState(result.status === "saved" ? "saved" : "failed");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const runImport = () => {
    setImporting(true);
    void onImportMedia()
      .then((result) => {
        if (result) setSaveState(result.status === "saved" ? "saved" : "failed");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const removeAsset = (asset: Asset) => {
    const name = assetName(asset);
    const uses = usage.get(asset.id) ?? 0;
    void confirm({
      title: uses > 0 ? t.inUseTitle : t.confirmDeleteTitle,
      description:
        uses > 0
          ? format(t.inUseBody, { count: uses, name })
          : format(t.confirmDeleteBody, { name }),
      confirmLabel: t.deleteMedia,
    }).then((ok) => {
      if (!ok) return;
      if (playingId === asset.id) setPlayingId(null);
      void onDeleteAsset(asset.id).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    });
  };

  const openRename = (asset: Asset) => {
    const name = assetName(asset);
    const dot = name.lastIndexOf(".");
    setRenameValue(dot > 0 ? name.slice(0, dot) : name);
    setRenameTarget(asset);
  };

  const submitRename = () => {
    const target = renameTarget;
    setRenameTarget(null);
    if (!target) return;
    void onRenameAsset(target.id, renameValue).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };

  const status = importing ? (
    <Status>{t.importing}</Status>
  ) : saveState === "failed" ? (
    <Status tone="warning">{t.importFailed}</Status>
  ) : null;

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button size="compact" disabled={importing}>
                  <Icon name="plus" size={18} />
                  {t.addMedia}
                  <Icon name="chevron-down" size={16} />
                </Button>
              }
            />
            <Menu.Portal>
              <Menu.Positioner className={styles.menuPositioner} sideOffset={4} align="end">
                <Menu.Popup className={styles.menuPopup}>
                  <Menu.Item className={styles.menuItem} onClick={runImport}>
                    <Icon name="upload" size={18} />
                    {t.importFromDevice}
                  </Menu.Item>
                  <Menu.Item className={styles.menuItem} onClick={runFolderImport}>
                    <Icon name="folder" size={18} />
                    {t.importFolder}
                  </Menu.Item>
                  <Menu.Item
                    className={styles.menuItem}
                    onClick={() => {
                      setSearchMode("images");
                    }}
                  >
                    <Icon name="image" size={18} />
                    {t.searchUnsplashImages}
                  </Menu.Item>
                  <Menu.Item
                    className={styles.menuItem}
                    onClick={() => {
                      setSearchMode("audio");
                    }}
                  >
                    <Icon name="audio" size={18} />
                    {t.searchTatoebaAudio}
                  </Menu.Item>
                  <Menu.Item
                    className={styles.menuItem}
                    onClick={() => {
                      setShowTts(true);
                    }}
                  >
                    <Icon name="mic" size={18} />
                    {t.addTts}
                  </Menu.Item>
                  <Menu.Item
                    className={styles.menuItem}
                    onClick={() => {
                      setShowRecord(true);
                    }}
                  >
                    <Icon name="audio" size={18} />
                    {t.recordAudio}
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        }
      />

      <section aria-labelledby="media-title">
        <PanelHeader
          title={t.projectMedia}
          titleId="media-title"
          description={format(t.showing, {
            shown: Math.min(visibleCount, filtered.length),
            total: filtered.length,
          })}
          actions={status}
        />

        <div className={styles.searchBar}>
          <Icon name="search" size={18} />
          <TextInput
            type="search"
            className={styles.searchInput}
            style={{ paddingInlineStart: "2.5rem" }}
            aria-label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
          />
        </div>

        {course.assets.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>{t.noResults}</p>
        ) : (
          <>
            <div className={styles.grid} aria-label={t.projectMedia}>
              {visible.map((asset) => (
                <MediaCard
                  key={asset.id}
                  asset={asset}
                  preview={previews[asset.id]}
                  kindLabel={kindLabel[asset.kind]}
                  playing={playingId === asset.id}
                  messages={messages}
                  onTogglePlay={(next) => {
                    setPlayingId(next ? asset.id : null);
                  }}
                  onLoadUrl={onLoadPreview}
                  onDelete={() => {
                    removeAsset(asset);
                  }}
                  onRename={() => {
                    openRename(asset);
                  }}
                />
              ))}
            </div>

            {hasMore ? (
              <div className={styles.more}>
                <div ref={sentinelRef} aria-hidden className={styles.sentinel} />
                <Button
                  variant="ghost"
                  onClick={() => {
                    setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
                  }}
                >
                  {t.loadMore}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {searchMode ? (
        <MediaSearchDialog
          mode={searchMode}
          onClose={() => {
            setSearchMode(null);
          }}
          onSearchImages={onSearchImages}
          onSearchAudio={onSearchAudio}
          onAddRemoteMedia={onAddRemoteMedia}
        />
      ) : null}

      {showTts ? (
        <TtsDialog
          onClose={() => {
            setShowTts(false);
          }}
          onListVoices={onListTtsVoices}
          onPreviewVoice={onPreviewTtsVoice}
          onListAvailableVoices={onListAvailableVoices}
          onDownloadVoice={onDownloadVoice}
          onRemoveVoice={onRemoveVoice}
          onAddTtsAudio={(text, voice, fileName) =>
            onAddTtsAudio(text, voice, fileName).then((result) => {
              setSaveState(result.ok ? "saved" : "failed");
              return result;
            })
          }
        />
      ) : null}

      {showRecord ? (
        <RecordDialog
          onClose={() => {
            setShowRecord(false);
          }}
          onAddRecording={(bytes, mimeType, ext) =>
            onAddRecording(bytes, mimeType, ext).then((result) => {
              if (result) setSaveState(result.status === "saved" ? "saved" : "failed");
              return result;
            })
          }
        />
      ) : null}

      {renameTarget ? (
        <div
          className={styles.renameOverlay}
          role="presentation"
          onClick={() => {
            setRenameTarget(null);
          }}
        >
          <form
            className={styles.renameDialog}
            role="dialog"
            aria-modal="true"
            aria-label={t.renameTitle}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <h2 className={styles.renameTitle}>{t.renameTitle}</h2>
            <Field label={t.renameLabel}>
              <TextInput
                autoFocus
                value={renameValue}
                autoComplete="off"
                onChange={(event) => {
                  setRenameValue(event.currentTarget.value);
                }}
              />
            </Field>
            <div className={styles.renameActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRenameTarget(null);
                }}
              >
                {t.renameCancel}
              </Button>
              <Button type="submit" disabled={renameValue.trim() === ""}>
                {messages.common.save}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </WorkInner>
  );
}

interface MediaCardProps {
  readonly asset: Asset;
  readonly preview: string | undefined;
  readonly kindLabel: string;
  readonly playing: boolean;
  readonly messages: StudioMessages;
  readonly onTogglePlay: (next: boolean) => void;
  readonly onLoadUrl: (assetId: string) => Promise<string | null>;
  readonly onDelete: () => void;
  readonly onRename: () => void;
}

function MediaCard({
  asset,
  preview,
  kindLabel,
  playing,
  messages,
  onTogglePlay,
  onLoadUrl,
  onDelete,
  onRename,
}: MediaCardProps) {
  const t = messages.media;
  const format = useFormat();
  const name = assetName(asset);
  const ready = asset.availability === "ready" && Boolean(asset.file);
  const author = typeof asset.metadata?.author === "string" ? asset.metadata.author : "";
  const license = typeof asset.metadata?.license === "string" ? asset.metadata.license : "";
  const credit = author && license ? format(t.credit, { author, license }) : author || license;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const element = audioRef.current;
    if (!playing && element) {
      element.pause();
      element.currentTime = 0;
    }
  }, [playing]);

  useEffect(() => {
    const element = audioRef.current;
    if (playing && element && audioUrl) void element.play().catch(() => undefined);
  }, [playing, audioUrl]);

  const toggleAudio = async () => {
    if (playing) {
      onTogglePlay(false);
      return;
    }
    let url = audioUrl;
    if (!url) {
      url = await onLoadUrl(asset.id);
      if (!url) return;
      setAudioUrl(url);
    }
    onTogglePlay(true);
  };

  return (
    <article className={styles.card}>
      <div className={styles.thumb}>
        {asset.kind === "image" && ready && preview ? (
          <img className={styles.image} src={preview} alt="" loading="lazy" decoding="async" />
        ) : asset.kind === "audio" && ready ? (
          <button
            type="button"
            className={styles.playButton}
            aria-label={playing ? format(t.stop, { name }) : format(t.play, { name })}
            onClick={() => {
              void toggleAudio();
            }}
          >
            <Icon name={playing ? "stop" : "play"} size={28} />
          </button>
        ) : (
          <span className={styles.placeholderIcon}>
            <Icon name={asset.kind} size={28} />
          </span>
        )}
      </div>

      <div className={styles.cardBody}>
        <span className={styles.cardTitle} title={name}>
          {name}
        </span>
        <span className={styles.meta}>
          <span>{kindLabel}</span>
          <span>{asset.mimeType}</span>
        </span>
        {credit ? (
          <span className={styles.credit} title={credit}>
            {credit}
          </span>
        ) : null}
        <div className={styles.cardFooter}>
          <IconButton aria-label={t.renameMedia} size="sm" onClick={onRename}>
            <Icon name="edit" size={18} />
          </IconButton>
          <IconButton
            aria-label={format(messages.common.remove, { label: name })}
            size="sm"
            onClick={onDelete}
          >
            <Icon name="trash" size={18} />
          </IconButton>
        </div>
      </div>

      {asset.kind === "audio" && ready ? (
        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          preload="none"
          onEnded={() => {
            onTogglePlay(false);
          }}
        />
      ) : null}
    </article>
  );
}
