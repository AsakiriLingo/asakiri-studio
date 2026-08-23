import { useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Group, Panel, Separator, type PanelImperativeHandle } from "react-resizable-panels";
import type { Asset, ContentRecord, Course } from "@core/course";
import type { AudioSearchResult, ImageSearchResult, SearchPage } from "@core/media-search";
import type { ProjectWriteResult } from "@core/project-writing";
import type { CatalogVoice, DownloadProgress, TtsSaveResult, TtsVoice } from "@core/tts";
import { useFormat, useMessages, type StudioMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Field, TextInput } from "@shared/components/form";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { ScrollArea } from "@shared/components/scroll-area";
import { Status } from "@shared/components/status";
import { MediaSearchDialog, type MediaSearchMode } from "@features/media/MediaSearchDialog";
import { TtsDialog } from "@features/media/TtsDialog";
import { RecordDialog } from "@features/media/RecordDialog";
import { InspectorPlayer } from "@features/media/InspectorPlayer";
import styles from "@features/media/CourseMedia.module.css";

const PAGE_SIZE = 24;
const ANIMATION_MS = 180;

type MediaView = "all" | "image" | "audio" | "video" | "unreferenced";

function joinClassNames(...classNames: (string | undefined | false)[]): string {
  return classNames.filter(Boolean).join(" ");
}

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit] ?? "KB"}`;
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
  const [lastKey, setLastKey] = useState("all|");
  const [view, setView] = useState<MediaView>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [searchMode, setSearchMode] = useState<MediaSearchMode | null>(null);
  const [showTts, setShowTts] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Asset | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inspectorRef = useRef<PanelImperativeHandle>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    },
    [],
  );

  const animate = (action: () => void) => {
    setAnimating(true);
    action();
    if (animationTimer.current) clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_MS);
  };

  const selectAsset = (id: string) => {
    setSelectedId(id);
    if (inspectorCollapsed) animate(() => inspectorRef.current?.expand());
  };

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

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of course.records) {
      for (const assetId of referencedAssetIds(record)) {
        counts.set(assetId, (counts.get(assetId) ?? 0) + 1);
      }
    }
    return counts;
  }, [course.records]);

  const counts = useMemo(() => {
    const tally = { all: 0, image: 0, audio: 0, video: 0, unreferenced: 0 };
    for (const asset of course.assets) {
      tally.all += 1;
      tally[asset.kind] += 1;
      if ((usage.get(asset.id) ?? 0) === 0) tally.unreferenced += 1;
    }
    return tally;
  }, [course.assets, usage]);

  const filtered = useMemo(() => {
    return course.assets.filter((asset) => {
      if (view === "unreferenced") {
        if ((usage.get(asset.id) ?? 0) !== 0) return false;
      } else if (view !== "all" && asset.kind !== view) {
        return false;
      }
      return settledQuery === "" || matchesQuery(asset, settledQuery);
    });
  }, [course.assets, view, settledQuery, usage]);

  const currentKey = `${view}|${settledQuery}`;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const selected =
    selectedId === null ? null : (course.assets.find((a) => a.id === selectedId) ?? null);

  const requested = useRef<Set<string>>(new Set());
  const visiblePreviewIds = visible
    .filter(
      (asset) =>
        (asset.kind === "image" || asset.kind === "video") &&
        asset.availability === "ready" &&
        asset.file,
    )
    .map((asset) => asset.id)
    .join(",");
  useEffect(() => {
    let cancelled = false;
    for (const id of visiblePreviewIds.split(",").filter(Boolean)) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      void loadRef.current(id).then((url) => {
        if (!cancelled && url) setPreviews((prev) => ({ ...prev, [id]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [visiblePreviewIds]);

  useEffect(() => {
    const target = selected;
    if (target === null) return;
    if (target.availability !== "ready" || !target.file) return;
    if (requested.current.has(target.id)) return;
    requested.current.add(target.id);
    void loadRef.current(target.id).then((url) => {
      if (url) setPreviews((prev) => ({ ...prev, [target.id]: url }));
    });
  }, [selected]);

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
      if (selectedId === asset.id) setSelectedId(null);
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

  const views: readonly { key: MediaView; label: string; icon: IconName; count: number }[] = [
    { key: "all", label: t.viewAll, icon: "media", count: counts.all },
    { key: "image", label: t.kindImage, icon: "image", count: counts.image },
    { key: "audio", label: t.kindAudio, icon: "audio", count: counts.audio },
    { key: "video", label: t.kindVideo, icon: "video", count: counts.video },
    { key: "unreferenced", label: t.notReferenced, icon: "eye", count: counts.unreferenced },
  ];

  const addMenu = (
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
              <Icon name="audio" size={18} />
              {t.addTts}
            </Menu.Item>
            <Menu.Item
              className={styles.menuItem}
              onClick={() => {
                setShowRecord(true);
              }}
            >
              <Icon name="mic" size={18} />
              {t.recordAudio}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );

  return (
    <div className={styles.media}>
      <aside className={styles.sidebar} aria-label={t.projectMedia}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>{t.projectMedia}</span>
        </div>
        <div className={styles.list}>
          {views.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={joinClassNames(styles.viewRow, view === entry.key && styles.viewSelected)}
              aria-pressed={view === entry.key}
              onClick={() => {
                setView(entry.key);
              }}
            >
              <Icon name={entry.icon} size={16} />
              <span className={styles.viewLabel}>{entry.label}</span>
              <span className={styles.count}>{entry.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <Group
        orientation="horizontal"
        id="asakiri.media-inspector"
        className={joinClassNames(styles.group, animating && styles.animating)}
      >
        <Panel id="grid" minSize="24rem" className={styles.gridPanel}>
          <div className={styles.toolbar}>
            <div className={styles.searchBar}>
              <Icon name="search" size={18} />
              <TextInput
                type="search"
                className={styles.searchInput}
                style={{ paddingInlineStart: "2.25rem" }}
                aria-label={t.searchLabel}
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                }}
              />
            </div>
            <span className={styles.toolbarCount}>
              {format(t.showing, {
                shown: Math.min(visibleCount, filtered.length),
                total: filtered.length,
              })}
            </span>
            {importing ? <Status>{t.importing}</Status> : null}
            {!importing && saveState === "failed" ? (
              <Status tone="warning">{t.importFailed}</Status>
            ) : null}
            {addMenu}
          </div>

          <div className={styles.body}>
            {course.assets.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <Icon name="media" size={32} />
                </span>
                <p className={styles.empty}>{t.empty}</p>
                {addMenu}
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.empty}>{t.noResults}</p>
              </div>
            ) : (
              <ScrollArea className={styles.gridScroll} contentClassName={styles.gridContent}>
                <div className={styles.grid} aria-label={t.projectMedia}>
                  {visible.map((asset) => (
                    <MediaCard
                      key={asset.id}
                      asset={asset}
                      preview={previews[asset.id]}
                      uses={usage.get(asset.id) ?? 0}
                      playing={playingId === asset.id}
                      selected={selectedId === asset.id}
                      messages={messages}
                      onSelect={() => {
                        selectAsset(asset.id);
                      }}
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
              </ScrollArea>
            )}
          </div>
        </Panel>

        <Separator className={styles.handle} />

        <Panel
          id="inspector"
          collapsible
          collapsedSize={0}
          minSize="306px"
          maxSize="40%"
          defaultSize="20rem"
          panelRef={inspectorRef}
          onResize={(size) => {
            setInspectorCollapsed(size.inPixels === 0);
          }}
          className={styles.inspectorPanel}
        >
          <div className={styles.inspectorHeader}>
            <span
              className={styles.inspectorTitle}
              title={selected ? assetName(selected) : undefined}
            >
              {selected ? assetName(selected) : ""}
            </span>
            <IconButton
              size="sm"
              aria-label={t.hideDetails}
              onClick={() => {
                animate(() => inspectorRef.current?.collapse());
              }}
            >
              <Icon name="sidebar-right" size={18} />
            </IconButton>
          </div>
          <ScrollArea
            className={styles.inspectorScroll}
            contentClassName={styles.inspectorScrollBody}
            contentStyle={{ minWidth: 0 }}
          >
            {selected ? (
              <MediaInspectorBody
                asset={selected}
                preview={previews[selected.id]}
                uses={usage.get(selected.id) ?? 0}
                messages={messages}
                onRename={() => {
                  openRename(selected);
                }}
                onDelete={() => {
                  removeAsset(selected);
                }}
              />
            ) : (
              <p className={styles.inspectorEmpty}>{t.inspectorEmpty}</p>
            )}
          </ScrollArea>
        </Panel>
      </Group>

      {inspectorCollapsed ? (
        <div className={joinClassNames(styles.pill, styles.pillRight)}>
          <IconButton
            size="sm"
            aria-label={t.showDetails}
            onClick={() => {
              animate(() => inspectorRef.current?.expand());
            }}
          >
            <Icon name="sidebar-right" size={18} />
          </IconButton>
        </div>
      ) : null}

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
    </div>
  );
}

interface MediaCardProps {
  readonly asset: Asset;
  readonly preview: string | undefined;
  readonly uses: number;
  readonly playing: boolean;
  readonly selected: boolean;
  readonly messages: StudioMessages;
  readonly onSelect: () => void;
  readonly onTogglePlay: (next: boolean) => void;
  readonly onLoadUrl: (assetId: string) => Promise<string | null>;
  readonly onDelete: () => void;
  readonly onRename: () => void;
}

function MediaCard({
  asset,
  preview,
  uses,
  playing,
  selected,
  messages,
  onSelect,
  onTogglePlay,
  onLoadUrl,
  onDelete,
  onRename,
}: MediaCardProps) {
  const t = messages.media;
  const format = useFormat();
  const name = assetName(asset);
  const ready = asset.availability === "ready" && Boolean(asset.file);
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
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={
          <article
            className={joinClassNames(styles.card, selected && styles.cardSelected)}
            role="button"
            tabIndex={0}
            aria-label={name}
            aria-pressed={selected}
            onClick={onSelect}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }}
          >
            <div className={styles.thumb}>
              {asset.kind === "image" && ready && preview ? (
                <img
                  className={styles.image}
                  src={preview}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : asset.kind === "video" && ready && preview ? (
                <video
                  className={styles.image}
                  src={preview}
                  muted
                  preload="metadata"
                  playsInline
                />
              ) : asset.kind === "audio" && ready ? (
                <button
                  type="button"
                  className={styles.playButton}
                  aria-label={playing ? format(t.stop, { name }) : format(t.play, { name })}
                  onClick={(event) => {
                    event.stopPropagation();
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
              {!ready ? <span className={styles.badge}>{t.placeholder}</span> : null}
            </div>

            <div className={styles.cardBody}>
              <span className={styles.cardTitle} title={name}>
                {name}
              </span>
              <span className={styles.meta}>
                {uses > 0 ? format(t.usedIn, { count: uses }) : t.notReferenced}
              </span>
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
        }
      />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={styles.menuPositioner}>
          <ContextMenu.Popup className={styles.menuPopup}>
            <ContextMenu.Item className={styles.menuItem} onClick={onRename}>
              <Icon name="edit" size={18} />
              {t.renameMedia}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={joinClassNames(styles.menuItem, styles.menuItemDanger)}
              onClick={onDelete}
            >
              <Icon name="trash" size={18} />
              {t.deleteMedia}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface MediaInspectorBodyProps {
  readonly asset: Asset;
  readonly preview: string | undefined;
  readonly uses: number;
  readonly messages: StudioMessages;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

function MediaInspectorBody({
  asset,
  preview,
  uses,
  messages,
  onRename,
  onDelete,
}: MediaInspectorBodyProps) {
  const t = messages.media;
  const format = useFormat();
  const ready = asset.availability === "ready" && Boolean(asset.file);
  const author = typeof asset.metadata?.author === "string" ? asset.metadata.author : "";
  const license = typeof asset.metadata?.license === "string" ? asset.metadata.license : "";
  const credit = author && license ? format(t.credit, { author, license }) : author || license;

  return (
    <>
      {asset.kind === "audio" && ready && preview ? (
        <InspectorPlayer src={preview} type={asset.mimeType} title={assetName(asset)} />
      ) : asset.kind === "video" && ready && preview ? (
        <video
          className={styles.inspectorVideo}
          src={preview}
          controls
          preload="metadata"
          playsInline
        />
      ) : (
        <div className={styles.inspectorPreview}>
          {asset.kind === "image" && ready && preview ? (
            <img className={styles.inspectorImage} src={preview} alt="" />
          ) : (
            <span className={styles.placeholderIcon}>
              <Icon name={asset.kind} size={40} />
            </span>
          )}
        </div>
      )}

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>{asset.mimeType}</dt>
          <dd />
        </div>
        {typeof asset.byteSize === "number" ? (
          <div className={styles.detailRow}>
            <dt>{formatBytes(asset.byteSize)}</dt>
            <dd />
          </div>
        ) : null}
        <div className={styles.detailRow}>
          <dt>{uses > 0 ? format(t.usedIn, { count: uses }) : t.notReferenced}</dt>
          <dd />
        </div>
        {credit ? (
          <div className={styles.detailRow}>
            <dt title={credit}>{credit}</dt>
            <dd />
          </div>
        ) : null}
        {!ready ? (
          <div className={styles.detailRow}>
            <dt>
              <span className={styles.badge}>{t.placeholder}</span>
            </dt>
            <dd />
          </div>
        ) : null}
      </dl>

      <div className={styles.inspectorActions}>
        <Button variant="secondary" size="compact" onClick={onRename}>
          <Icon name="edit" size={16} />
          {t.renameMedia}
        </Button>
        <Button variant="secondary" size="compact" onClick={onDelete}>
          <Icon name="trash" size={16} />
          {t.deleteMedia}
        </Button>
      </div>
    </>
  );
}
