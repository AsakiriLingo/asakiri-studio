import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ContextMenu } from "@base-ui/react/context-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Group, Panel, Separator, type PanelImperativeHandle } from "react-resizable-panels";
import type { Asset, ContentRecord, Course, MediaFolder } from "@core/course";
import { canAddSubfolder, mediaFolderChildren, mediaFolderSubtreeIds } from "@core/course";
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

export type MediaSelection =
  | { readonly kind: "view"; readonly view: MediaView }
  | { readonly kind: "folder"; readonly id: string };

type FolderDialog =
  | { readonly mode: "create"; readonly parentId: string | null }
  | { readonly mode: "rename"; readonly id: string };

function flattenFolders(
  folders: readonly MediaFolder[],
  parentId: string | null,
  depth: number,
): { readonly folder: MediaFolder; readonly depth: number }[] {
  return mediaFolderChildren(folders, parentId).flatMap((folder) => [
    { folder, depth },
    ...flattenFolders(folders, folder.id, depth + 1),
  ]);
}

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
  readonly onImportMedia: (folderId: string | null) => Promise<ProjectWriteResult | null>;
  readonly onImportMediaFolder: (folderId: string | null) => Promise<ProjectWriteResult | null>;
  readonly onDeleteAsset: (assetId: string) => Promise<ProjectWriteResult>;
  readonly onLoadPreview: (assetId: string) => Promise<string | null>;
  readonly onSearchImages: (query: string, page: number) => Promise<SearchPage<ImageSearchResult>>;
  readonly onSearchAudio: (query: string, page: number) => Promise<SearchPage<AudioSearchResult>>;
  readonly onAddRemoteMedia: (
    url: string,
    fileName: string,
    metadata: Readonly<Record<string, unknown>>,
    folderId?: string | null,
  ) => Promise<ProjectWriteResult | null>;
  readonly onRenameAsset: (assetId: string, name: string) => Promise<ProjectWriteResult>;
  readonly inspectorCollapsed: boolean;
  readonly onInspectorCollapsedChange: (collapsed: boolean) => void;
  readonly selection: MediaSelection;
  readonly onSelectionChange: (selection: MediaSelection) => void;
  readonly selectedId: string | null;
  readonly onSelectedIdChange: (id: string | null) => void;
  readonly onMoveAsset: (assetId: string, folderId: string | null) => Promise<ProjectWriteResult>;
  readonly onCreateFolder: (name: string, parentId: string | null) => Promise<string | null>;
  readonly onRenameFolder: (folderId: string, name: string) => Promise<ProjectWriteResult>;
  readonly onDeleteFolder: (folderId: string) => Promise<ProjectWriteResult>;
  readonly onListTtsVoices: () => Promise<readonly TtsVoice[]>;
  readonly onPreviewTtsVoice: (text: string, voice: string) => Promise<string>;
  readonly onListAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly onDownloadVoice: (voiceId: string, onProgress?: DownloadProgress) => Promise<boolean>;
  readonly onRemoveVoice: (voiceId: string) => Promise<boolean>;
  readonly onAddTtsAudio: (
    text: string,
    voice: string,
    fileName: string,
    folderId?: string | null,
  ) => Promise<TtsSaveResult>;
  readonly onAddRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
    folderId?: string | null,
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
  inspectorCollapsed,
  onInspectorCollapsedChange,
  selection,
  onSelectionChange,
  selectedId,
  onSelectedIdChange,
  onMoveAsset,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
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
  const [lastKey, setLastKey] = useState("view:all|");
  const setSelection = onSelectionChange;
  const [expandedFolders, setExpandedFolders] = useState<ReadonlySet<string>>(new Set());
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null);
  const [folderName, setFolderName] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const setSelectedId = onSelectedIdChange;
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const rootDroppable = useDroppable({ id: "root" });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [searchMode, setSearchMode] = useState<MediaSearchMode | null>(null);
  const [showTts, setShowTts] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Asset | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [animating, setAnimating] = useState(false);
  const inspectorRef = useRef<PanelImperativeHandle>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const panel = inspectorRef.current;
    if (!panel) return;
    if (inspectorCollapsed && !panel.isCollapsed()) panel.collapse();
    else if (!inspectorCollapsed && panel.isCollapsed()) panel.expand();
  }, [inspectorCollapsed]);

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

  const folderCounts = useMemo(() => {
    const direct = new Map<string, number>();
    for (const asset of course.assets) {
      if (asset.folderId) direct.set(asset.folderId, (direct.get(asset.folderId) ?? 0) + 1);
    }
    const total = new Map<string, number>();
    for (const folder of course.mediaFolders) {
      let sum = 0;
      for (const id of mediaFolderSubtreeIds(course.mediaFolders, folder.id)) {
        sum += direct.get(id) ?? 0;
      }
      total.set(folder.id, sum);
    }
    return total;
  }, [course.assets, course.mediaFolders]);

  const filtered = useMemo(() => {
    const subtree =
      selection.kind === "folder"
        ? new Set(mediaFolderSubtreeIds(course.mediaFolders, selection.id))
        : null;
    return course.assets.filter((asset) => {
      if (selection.kind === "folder") {
        if (!subtree || asset.folderId === undefined || !subtree.has(asset.folderId)) return false;
      } else if (selection.view === "unreferenced") {
        if ((usage.get(asset.id) ?? 0) !== 0) return false;
      } else if (selection.view !== "all" && asset.kind !== selection.view) {
        return false;
      }
      return settledQuery === "" || matchesQuery(asset, settledQuery);
    });
  }, [course.assets, course.mediaFolders, selection, settledQuery, usage]);

  const currentKey = `${selection.kind === "view" ? selection.view : `folder:${selection.id}`}|${settledQuery}`;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    setVisibleCount(PAGE_SIZE);
    setPlayingId(null);
    setSelectedIds(new Set());
    setAnchorId(null);
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

  const activeFolderId = selection.kind === "folder" ? selection.id : null;

  const runFolderImport = () => {
    setImporting(true);
    void onImportMediaFolder(activeFolderId)
      .then((result) => {
        if (result) setSaveState(result.status === "saved" ? "saved" : "failed");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const runImport = () => {
    setImporting(true);
    void onImportMedia(activeFolderId)
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

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openFolderDialog = (dialog: FolderDialog, initial: string) => {
    setFolderName(initial);
    setFolderDialog(dialog);
  };

  const submitFolder = () => {
    const dialog = folderDialog;
    setFolderDialog(null);
    if (!dialog) return;
    if (dialog.mode === "create") {
      const parentId = dialog.parentId;
      if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
      void onCreateFolder(folderName, parentId).then((id) => {
        if (id) setSelection({ kind: "folder", id });
      });
    } else {
      void onRenameFolder(dialog.id, folderName).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    }
  };

  const removeFolder = (folder: MediaFolder) => {
    void confirm({
      title: t.confirmDeleteFolderTitle,
      description: format(t.confirmDeleteFolderBody, { name: folder.name }),
      confirmLabel: t.deleteFolder,
    }).then((ok) => {
      if (!ok) return;
      if (
        selection.kind === "folder" &&
        mediaFolderSubtreeIds(course.mediaFolders, folder.id).includes(selection.id)
      ) {
        setSelection({ kind: "view", view: "all" });
      }
      void onDeleteFolder(folder.id).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    });
  };

  const moveAsset = (assetId: string, folderId: string | null) => {
    void onMoveAsset(assetId, folderId).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };

  const moveMany = (ids: readonly string[], folderId: string | null) => {
    setSelectedIds(new Set());
    void Promise.all(ids.map((id) => onMoveAsset(id, folderId))).then((results) => {
      setSaveState(results.some((r) => r.status !== "saved") ? "failed" : "saved");
    });
  };

  const dragIdsFor = (assetId: string): string[] =>
    selectedIds.has(assetId) && selectedIds.size > 1 ? [...selectedIds] : [assetId];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    setActiveDragId(null);
    if (!event.over) return;
    const overId = String(event.over.id);
    const target = overId === "root" ? null : overId.startsWith("tile:") ? overId.slice(5) : overId;
    moveMany(dragIdsFor(activeId), target);
  };

  const dragCount = activeDragId === null ? 0 : dragIdsFor(activeDragId).length;

  const handleCardSelect = (id: string, mods: { shift: boolean; toggle: boolean }) => {
    if (mods.shift && anchorId !== null) {
      const ids = visible.map((asset) => asset.id);
      const from = ids.indexOf(anchorId);
      const to = ids.indexOf(id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        setSelectedIds(new Set(ids.slice(lo, hi + 1)));
      } else {
        setSelectedIds(new Set([id]));
      }
      setSelectedId(id);
    } else if (mods.toggle) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchorId(id);
      setSelectedId(id);
    } else {
      setSelectedIds(new Set([id]));
      setAnchorId(id);
      selectAsset(id);
    }
  };

  const flatFolders = flattenFolders(course.mediaFolders, null, 0);

  const childFolders =
    selection.kind === "folder" ? mediaFolderChildren(course.mediaFolders, selection.id) : [];
  const showFolderTiles = childFolders.length > 0 && settledQuery === "";

  const renderFolderRow = (folder: MediaFolder, depth: number): ReactNode => {
    const children = mediaFolderChildren(course.mediaFolders, folder.id);
    const open = expandedFolders.has(folder.id);
    const active = selection.kind === "folder" && selection.id === folder.id;
    return (
      <FolderRow
        key={folder.id}
        folder={folder}
        depth={depth}
        count={folderCounts.get(folder.id) ?? 0}
        active={active}
        open={open}
        hasChildren={children.length > 0}
        canSubfolder={canAddSubfolder(course.mediaFolders, folder.id)}
        messages={messages}
        onSelect={() => {
          setSelection({ kind: "folder", id: folder.id });
        }}
        onToggle={() => {
          toggleFolder(folder.id);
        }}
        onNewSubfolder={() => {
          openFolderDialog({ mode: "create", parentId: folder.id }, "");
        }}
        onRename={() => {
          openFolderDialog({ mode: "rename", id: folder.id }, folder.name);
        }}
        onDelete={() => {
          removeFolder(folder);
        }}
      >
        {open ? children.map((child) => renderFolderRow(child, depth + 1)) : null}
      </FolderRow>
    );
  };

  const views: readonly { key: MediaView; label: string; icon: IconName; count: number }[] = [
    { key: "all", label: t.viewAll, icon: "folder-photo", count: counts.all },
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

  const activeDragAsset =
    activeDragId === null ? null : (course.assets.find((a) => a.id === activeDragId) ?? null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragId(null);
      }}
    >
      <div className={styles.media}>
        <aside className={styles.sidebar} aria-label={t.projectMedia}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>{t.projectMedia}</span>
          </div>
          <div className={styles.list}>
            {views.map((entry) => {
              const active = selection.kind === "view" && selection.view === entry.key;
              const rootDrop = entry.key === "all";
              return (
                <button
                  key={entry.key}
                  type="button"
                  ref={rootDrop ? rootDroppable.setNodeRef : undefined}
                  className={joinClassNames(
                    styles.viewRow,
                    active && styles.viewSelected,
                    rootDrop && rootDroppable.isOver && styles.folderRowDrop,
                  )}
                  aria-pressed={active}
                  onClick={() => {
                    setSelection({ kind: "view", view: entry.key });
                  }}
                >
                  <Icon name={entry.icon} size={16} />
                  <span className={styles.viewLabel}>{entry.label}</span>
                  <span className={styles.count}>{entry.count}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>{t.folders}</span>
            <IconButton
              size="sm"
              aria-label={t.newFolder}
              onClick={() => {
                openFolderDialog({ mode: "create", parentId: null }, "");
              }}
            >
              <Icon name="plus" size={16} />
            </IconButton>
          </div>
          <div className={styles.list}>
            {mediaFolderChildren(course.mediaFolders, null).map((folder) =>
              renderFolderRow(folder, 0),
            )}
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
              {selectedIds.size >= 2 ? (
                <div className={styles.bulkBar}>
                  <span className={styles.toolbarCount}>
                    {format(t.selectedCount, { count: selectedIds.size })}
                  </span>
                  <Menu.Root>
                    <Menu.Trigger
                      render={
                        <Button variant="secondary" size="compact">
                          <Icon name="folder" size={16} />
                          {t.moveTo}
                          <Icon name="chevron-down" size={16} />
                        </Button>
                      }
                    />
                    <Menu.Portal>
                      <Menu.Positioner className={styles.menuPositioner} sideOffset={4}>
                        <Menu.Popup className={styles.menuPopup}>
                          <Menu.Item
                            className={styles.menuItem}
                            onClick={() => {
                              moveMany([...selectedIds], null);
                            }}
                          >
                            {t.noFolder}
                          </Menu.Item>
                          {flatFolders.map(({ folder, depth }) => (
                            <Menu.Item
                              key={folder.id}
                              className={styles.menuItem}
                              style={{
                                paddingInlineStart: `calc(var(--space-3) + ${String(depth)} * var(--space-3))`,
                              }}
                              onClick={() => {
                                moveMany([...selectedIds], folder.id);
                              }}
                            >
                              <Icon name="folder" size={18} />
                              {folder.name}
                            </Menu.Item>
                          ))}
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => {
                      setSelectedIds(new Set());
                    }}
                  >
                    {t.clearSelection}
                  </Button>
                </div>
              ) : (
                <span className={styles.toolbarCount}>
                  {format(t.showing, {
                    shown: Math.min(visibleCount, filtered.length),
                    total: filtered.length,
                  })}
                </span>
              )}
              {importing ? <Status>{t.importing}</Status> : null}
              {!importing && saveState === "failed" ? (
                <Status tone="warning">{t.importFailed}</Status>
              ) : null}
              {addMenu}
            </div>

            <div className={styles.body}>
              {course.assets.length === 0 && course.mediaFolders.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>
                    <Icon name="media" size={32} />
                  </span>
                  <p className={styles.empty}>{t.empty}</p>
                  {addMenu}
                </div>
              ) : filtered.length === 0 && !showFolderTiles ? (
                <div className={styles.emptyState}>
                  <p className={styles.empty}>
                    {selection.kind === "folder" && settledQuery === ""
                      ? t.emptyFolder
                      : t.noResults}
                  </p>
                </div>
              ) : (
                <ScrollArea className={styles.gridScroll} contentClassName={styles.gridContent}>
                  {showFolderTiles ? (
                    <div className={styles.folderTiles} aria-label={t.folders}>
                      {childFolders.map((folder) => (
                        <FolderTile
                          key={folder.id}
                          folder={folder}
                          count={folderCounts.get(folder.id) ?? 0}
                          canSubfolder={canAddSubfolder(course.mediaFolders, folder.id)}
                          messages={messages}
                          onOpen={() => {
                            setSelection({ kind: "folder", id: folder.id });
                          }}
                          onNewSubfolder={() => {
                            openFolderDialog({ mode: "create", parentId: folder.id }, "");
                          }}
                          onRename={() => {
                            openFolderDialog({ mode: "rename", id: folder.id }, folder.name);
                          }}
                          onDelete={() => {
                            removeFolder(folder);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.grid} aria-label={t.projectMedia}>
                    {visible.map((asset) => (
                      <MediaCard
                        key={asset.id}
                        asset={asset}
                        preview={previews[asset.id]}
                        uses={usage.get(asset.id) ?? 0}
                        playing={playingId === asset.id}
                        selected={selectedIds.has(asset.id)}
                        messages={messages}
                        folders={flatFolders}
                        onSelect={(mods) => {
                          handleCardSelect(asset.id, mods);
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
                        onMove={(folderId) => {
                          moveAsset(asset.id, folderId);
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
              onInspectorCollapsedChange(size.inPixels === 0);
            }}
            className={styles.inspectorPanel}
          >
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
            <div className={styles.inspectorFooter}>
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
            onAddRemoteMedia={(url, fileName, metadata) =>
              onAddRemoteMedia(url, fileName, metadata, activeFolderId)
            }
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
              onAddTtsAudio(text, voice, fileName, activeFolderId).then((result) => {
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
              onAddRecording(bytes, mimeType, ext, activeFolderId).then((result) => {
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

        {folderDialog ? (
          <div
            className={styles.renameOverlay}
            role="presentation"
            onClick={() => {
              setFolderDialog(null);
            }}
          >
            <form
              className={styles.renameDialog}
              role="dialog"
              aria-modal="true"
              aria-label={folderDialog.mode === "create" ? t.newFolder : t.renameFolder}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onSubmit={(event) => {
                event.preventDefault();
                submitFolder();
              }}
            >
              <h2 className={styles.renameTitle}>
                {folderDialog.mode === "create" ? t.newFolder : t.renameFolder}
              </h2>
              <Field label={t.folderName}>
                <TextInput
                  autoFocus
                  value={folderName}
                  autoComplete="off"
                  onChange={(event) => {
                    setFolderName(event.currentTarget.value);
                  }}
                />
              </Field>
              <div className={styles.renameActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFolderDialog(null);
                  }}
                >
                  {t.renameCancel}
                </Button>
                <Button type="submit" disabled={folderName.trim() === ""}>
                  {messages.common.save}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
      <DragOverlay>
        {activeDragAsset ? (
          <div className={styles.dragOverlay}>
            <Icon name="media" size={16} />
            {dragCount > 1
              ? format(t.selectedCount, { count: dragCount })
              : assetName(activeDragAsset)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface FolderRowProps {
  readonly folder: MediaFolder;
  readonly depth: number;
  readonly count: number;
  readonly active: boolean;
  readonly open: boolean;
  readonly hasChildren: boolean;
  readonly canSubfolder: boolean;
  readonly messages: StudioMessages;
  readonly onSelect: () => void;
  readonly onToggle: () => void;
  readonly onNewSubfolder: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly children: ReactNode;
}

function FolderRow({
  folder,
  depth,
  count,
  active,
  open,
  hasChildren,
  canSubfolder,
  messages,
  onSelect,
  onToggle,
  onNewSubfolder,
  onRename,
  onDelete,
  children,
}: FolderRowProps) {
  const t = messages.media;
  const { setNodeRef, isOver } = useDroppable({ id: folder.id });
  return (
    <div>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={
            <div
              ref={setNodeRef}
              className={joinClassNames(
                styles.folderRow,
                active && styles.folderRowActive,
                isOver && styles.folderRowDrop,
              )}
              style={{ paddingInlineStart: `calc(${String(depth)} * var(--space-4))` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.folderToggle}
                  aria-label={folder.name}
                  aria-expanded={open}
                  onClick={onToggle}
                >
                  <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
                </button>
              ) : (
                <span className={styles.folderToggle} aria-hidden />
              )}
              <button
                type="button"
                className={styles.folderLabel}
                aria-pressed={active}
                onClick={onSelect}
              >
                <Icon name="folder" size={16} />
                <span className={styles.viewLabel}>{folder.name}</span>
                <span className={styles.count}>{count}</span>
              </button>
            </div>
          }
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner className={styles.menuPositioner}>
            <ContextMenu.Popup className={styles.menuPopup}>
              {canSubfolder ? (
                <ContextMenu.Item className={styles.menuItem} onClick={onNewSubfolder}>
                  <Icon name="folder" size={18} />
                  {t.newSubfolder}
                </ContextMenu.Item>
              ) : null}
              <ContextMenu.Item className={styles.menuItem} onClick={onRename}>
                <Icon name="edit" size={18} />
                {t.renameFolder}
              </ContextMenu.Item>
              <ContextMenu.Item
                className={joinClassNames(styles.menuItem, styles.menuItemDanger)}
                onClick={onDelete}
              >
                <Icon name="trash" size={18} />
                {t.deleteFolder}
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {children}
    </div>
  );
}

interface FolderTileProps {
  readonly folder: MediaFolder;
  readonly count: number;
  readonly canSubfolder: boolean;
  readonly messages: StudioMessages;
  readonly onOpen: () => void;
  readonly onNewSubfolder: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

function FolderTile({
  folder,
  count,
  canSubfolder,
  messages,
  onOpen,
  onNewSubfolder,
  onRename,
  onDelete,
}: FolderTileProps) {
  const t = messages.media;
  const { setNodeRef, isOver } = useDroppable({ id: `tile:${folder.id}` });
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={
          <button
            ref={setNodeRef}
            type="button"
            className={joinClassNames(styles.folderTile, isOver && styles.folderTileDrop)}
            onClick={onOpen}
          >
            <Icon name="folder" size={22} />
            <span className={styles.folderTileName} title={folder.name}>
              {folder.name}
            </span>
            <span className={styles.count}>{count}</span>
          </button>
        }
      />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={styles.menuPositioner}>
          <ContextMenu.Popup className={styles.menuPopup}>
            {canSubfolder ? (
              <ContextMenu.Item className={styles.menuItem} onClick={onNewSubfolder}>
                <Icon name="folder" size={18} />
                {t.newSubfolder}
              </ContextMenu.Item>
            ) : null}
            <ContextMenu.Item className={styles.menuItem} onClick={onRename}>
              <Icon name="edit" size={18} />
              {t.renameFolder}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={joinClassNames(styles.menuItem, styles.menuItemDanger)}
              onClick={onDelete}
            >
              <Icon name="trash" size={18} />
              {t.deleteFolder}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

interface MediaCardProps {
  readonly asset: Asset;
  readonly preview: string | undefined;
  readonly uses: number;
  readonly playing: boolean;
  readonly selected: boolean;
  readonly messages: StudioMessages;
  readonly folders: readonly { readonly folder: MediaFolder; readonly depth: number }[];
  readonly onSelect: (mods: { shift: boolean; toggle: boolean }) => void;
  readonly onTogglePlay: (next: boolean) => void;
  readonly onLoadUrl: (assetId: string) => Promise<string | null>;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly onMove: (folderId: string | null) => void;
}

function MediaCard({
  asset,
  preview,
  uses,
  playing,
  selected,
  messages,
  folders,
  onSelect,
  onTogglePlay,
  onLoadUrl,
  onDelete,
  onRename,
  onMove,
}: MediaCardProps) {
  const t = messages.media;
  const format = useFormat();
  const name = assetName(asset);
  const ready = asset.availability === "ready" && Boolean(asset.file);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: asset.id });

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
            {...attributes}
            {...listeners}
            ref={setNodeRef}
            className={joinClassNames(
              styles.card,
              selected && styles.cardSelected,
              isDragging && styles.cardDragging,
            )}
            role="button"
            tabIndex={0}
            aria-label={name}
            aria-pressed={selected}
            onClick={(event) => {
              onSelect({ shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect({ shift: false, toggle: false });
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
            {folders.length > 0 ? (
              <ContextMenu.SubmenuRoot>
                <ContextMenu.SubmenuTrigger className={styles.menuItem}>
                  <Icon name="folder" size={18} />
                  <span className={styles.menuItemLabel}>{t.moveTo}</span>
                  <Icon name="chevron-right" size={16} />
                </ContextMenu.SubmenuTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner className={styles.menuPositioner}>
                    <ContextMenu.Popup className={styles.menuPopup}>
                      <ContextMenu.Item
                        className={styles.menuItem}
                        onClick={() => {
                          onMove(null);
                        }}
                      >
                        {t.noFolder}
                      </ContextMenu.Item>
                      {folders.map(({ folder, depth }) => (
                        <ContextMenu.Item
                          key={folder.id}
                          className={styles.menuItem}
                          style={{
                            paddingInlineStart: `calc(var(--space-3) + ${String(depth)} * var(--space-3))`,
                          }}
                          onClick={() => {
                            onMove(folder.id);
                          }}
                        >
                          <Icon name="folder" size={18} />
                          {folder.name}
                        </ContextMenu.Item>
                      ))}
                    </ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </ContextMenu.SubmenuRoot>
            ) : null}
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
      <span className={styles.inspectorName} title={assetName(asset)}>
        {assetName(asset)}
      </span>
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
