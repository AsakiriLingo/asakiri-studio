import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  AudioSearchResult,
  ImageSearchResult,
  MediaAttribution,
  SearchPage,
} from "@core/media-search";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Status } from "@shared/components/status";
import styles from "@features/media/MediaSearchDialog.module.css";

export type MediaSearchMode = "images" | "audio";

export interface MediaSearchDialogProps {
  readonly mode: MediaSearchMode;
  readonly onClose: () => void;
  readonly onSearchImages: (query: string, page: number) => Promise<SearchPage<ImageSearchResult>>;
  readonly onSearchAudio: (query: string, page: number) => Promise<SearchPage<AudioSearchResult>>;
  readonly onAddRemoteMedia: (
    url: string,
    fileName: string,
    metadata: Readonly<Record<string, unknown>>,
  ) => Promise<ProjectWriteResult | null>;
}

function toMetadata(attribution: MediaAttribution): Record<string, unknown> {
  return {
    provider: attribution.provider,
    author: attribution.author,
    ...(attribution.authorUrl ? { authorUrl: attribution.authorUrl } : {}),
    sourceUrl: attribution.sourceUrl,
    license: attribution.license,
    licenseUrl: attribution.licenseUrl,
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function MediaSearchDialog({
  mode,
  onClose,
  onSearchImages,
  onSearchAudio,
  onAddRemoteMedia,
}: MediaSearchDialogProps) {
  const messages = useMessages();
  const t = messages.media;

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [images, setImages] = useState<ImageSearchResult[]>([]);
  const [audios, setAudios] = useState<AudioSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  const requestId = useRef(0);

  const runSearch = async (term: string, nextPage: number) => {
    const token = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      if (mode === "images") {
        const result = await onSearchImages(term, nextPage);
        if (token !== requestId.current) return;
        setImages((prev) =>
          nextPage === 1 ? result.results.slice() : [...prev, ...result.results],
        );
        setHasMore(result.hasMore);
      } else {
        const result = await onSearchAudio(term, nextPage);
        if (token !== requestId.current) return;
        setAudios((prev) =>
          nextPage === 1 ? result.results.slice() : [...prev, ...result.results],
        );
        setHasMore(result.hasMore);
      }
    } catch {
      if (token === requestId.current) setFailed(true);
    } finally {
      if (token === requestId.current) setLoading(false);
    }
  };

  const submit = () => {
    const term = query.trim();
    if (!term) return;
    setSubmitted(term);
    setPage(1);
    setPlayingId(null);
    setImages([]);
    setAudios([]);
    void runSearch(term, 1);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void runSearch(submitted, next);
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: scrollRef.current, rootMargin: "300px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading]);

  const addImage = (item: ImageSearchResult) => {
    void add(
      item.id,
      item.downloadUrl,
      `unsplash-${slug(item.description ?? item.attribution.author) || item.id}.jpg`,
      toMetadata(item.attribution),
    );
  };
  const addAudio = (item: AudioSearchResult) => {
    void add(
      item.id,
      item.audioUrl,
      `tatoeba-${item.lang}-${item.id}.mp3`,
      toMetadata(item.attribution),
    );
  };
  const add = async (
    id: string,
    url: string,
    fileName: string,
    metadata: Readonly<Record<string, unknown>>,
  ) => {
    setAddingId(id);
    const result = await onAddRemoteMedia(url, fileName, metadata);
    setAddingId(null);
    if (result?.status === "saved") setAdded((prev) => ({ ...prev, [id]: true }));
  };

  const title = mode === "images" ? t.searchImagesTitle : t.searchAudioTitle;
  const placeholder = mode === "images" ? t.searchImagesPlaceholder : t.searchAudioPlaceholder;
  const credit = mode === "images" ? t.unsplashCredit : t.tatoebaCredit;
  const hasResults = mode === "images" ? images.length > 0 : audios.length > 0;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton aria-label={t.closeDialog} onClick={onClose}>
            <Icon name="close" size={18} />
          </IconButton>
        </header>

        <form
          className={styles.searchRow}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className={styles.searchField}>
            <Icon name="search" size={18} />
            <input
              className={styles.searchInput}
              type="search"
              autoFocus
              placeholder={placeholder}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
              }}
            />
          </div>
          <Button type="submit" disabled={loading || query.trim() === ""}>
            {t.searchSubmit}
          </Button>
        </form>

        <div className={styles.body} ref={scrollRef}>
          {failed ? (
            <Message>
              <Status tone="warning">{t.searchFailed}</Status>
            </Message>
          ) : !submitted ? (
            <Message>{t.searchPrompt}</Message>
          ) : !hasResults && loading ? (
            <Message>{t.searching}</Message>
          ) : !hasResults ? (
            <Message>{t.noSearchResults}</Message>
          ) : (
            <>
              <div className={styles.grid}>
                {mode === "images"
                  ? images.map((item) => (
                      <figure key={item.id} className={styles.card}>
                        <div className={styles.thumb}>
                          <img
                            className={styles.image}
                            src={item.thumbUrl}
                            alt={item.description ?? ""}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <figcaption className={styles.caption}>
                          <span className={styles.audioText}>
                            {t.byAuthor(item.attribution.author)}
                          </span>
                          <span className={styles.audioLang}>{item.attribution.license}</span>
                        </figcaption>
                        <AddButton
                          added={added[item.id]}
                          adding={addingId === item.id}
                          onAdd={() => {
                            addImage(item);
                          }}
                          labels={{ add: t.add, adding: t.adding, added: t.added }}
                        />
                      </figure>
                    ))
                  : audios.map((item) => (
                      <figure key={item.id} className={styles.card}>
                        <div className={styles.thumb}>
                          <AudioPreview
                            url={item.audioUrl}
                            playing={playingId === item.id}
                            onToggle={(next) => {
                              setPlayingId(next ? item.id : null);
                            }}
                            label={playingId === item.id ? t.stop(item.text) : t.play(item.text)}
                          />
                        </div>
                        <figcaption className={styles.caption} title={item.text}>
                          <span className={styles.audioText}>{item.text}</span>
                          <span className={styles.audioLang}>{t.resultLang(item.lang)}</span>
                        </figcaption>
                        <AddButton
                          added={added[item.id]}
                          adding={addingId === item.id}
                          onAdd={() => {
                            addAudio(item);
                          }}
                          labels={{ add: t.add, adding: t.adding, added: t.added }}
                        />
                      </figure>
                    ))}
              </div>
              {hasMore ? (
                <div className={styles.more}>
                  <div ref={sentinelRef} aria-hidden className={styles.sentinel} />
                  <Button variant="ghost" disabled={loading} onClick={loadMore}>
                    {loading ? t.searching : t.loadMore}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className={styles.footer}>{credit}</footer>
      </div>
    </div>
  );
}

function Message({ children }: { readonly children: ReactNode }) {
  return <p className={styles.message}>{children}</p>;
}

function AddButton({
  added,
  adding,
  onAdd,
  labels,
}: {
  readonly added: boolean | undefined;
  readonly adding: boolean;
  readonly onAdd: () => void;
  readonly labels: { readonly add: string; readonly adding: string; readonly added: string };
}) {
  return (
    <Button
      className={styles.addButton}
      variant={added ? "ghost" : "primary"}
      disabled={adding || Boolean(added)}
      onClick={onAdd}
    >
      {added ? (
        <>
          <Icon name="check" size={16} />
          {labels.added}
        </>
      ) : adding ? (
        labels.adding
      ) : (
        <>
          <Icon name="plus" size={16} />
          {labels.add}
        </>
      )}
    </Button>
  );
}

function AudioPreview({
  url,
  playing,
  onToggle,
  label,
}: {
  readonly url: string;
  readonly playing: boolean;
  readonly onToggle: (next: boolean) => void;
  readonly label: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    if (playing) void element.play().catch(() => undefined);
    else {
      element.pause();
      element.currentTime = 0;
    }
  }, [playing]);

  return (
    <>
      <button
        type="button"
        className={styles.playButton}
        aria-label={label}
        onClick={() => {
          onToggle(!playing);
        }}
      >
        <Icon name={playing ? "stop" : "play"} size={26} />
      </button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onEnded={() => {
          onToggle(false);
        }}
      />
    </>
  );
}
