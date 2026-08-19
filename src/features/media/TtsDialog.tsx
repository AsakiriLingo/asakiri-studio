import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogVoice, TtsSaveResult, TtsVoice } from "@core/tts";
import { useLocale, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Field, TextArea, TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Select, type SelectOption } from "@shared/components/select";
import { Status } from "@shared/components/status";
import styles from "@features/media/TtsDialog.module.css";

export interface TtsDialogProps {
  readonly onClose: () => void;
  readonly onListVoices: () => Promise<readonly TtsVoice[]>;
  readonly onPreviewVoice: (text: string, voice: string) => Promise<string>;
  readonly onListAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly onDownloadVoice: (
    voiceId: string,
    onProgress?: (downloaded: number, total: number) => void,
  ) => Promise<boolean>;
  readonly onRemoveVoice: (voiceId: string) => Promise<boolean>;
  readonly onAddTtsAudio: (text: string, voice: string, fileName: string) => Promise<TtsSaveResult>;
}

function fileNameFromText(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base === "" ? "tts-audio" : base}.wav`;
}

function formatSize(bytes: number): string {
  return `${String(Math.max(1, Math.round(bytes / 1_000_000)))} MB`;
}

export function TtsDialog({
  onClose,
  onListVoices,
  onPreviewVoice,
  onListAvailableVoices,
  onDownloadVoice,
  onRemoveVoice,
  onAddTtsAudio,
}: TtsDialogProps) {
  const messages = useMessages();
  const uiLocale = useLocale();
  const t = messages.media;

  const [voices, setVoices] = useState<readonly TtsVoice[] | null>(null);
  const [locale, setLocale] = useState("");
  const [voice, setVoice] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<"compose" | "manage">("compose");
  const [catalog, setCatalog] = useState<readonly CatalogVoice[] | null>(null);
  const [manageQuery, setManageQuery] = useState("");
  const [busyVoice, setBusyVoice] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ readonly downloaded: number; readonly total: number }>(
    { downloaded: 0, total: 0 },
  );
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [playingSample, setPlayingSample] = useState<string | null>(null);
  const sampleAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      sampleAudio.current?.pause();
      sampleAudio.current = null;
      previewAudio.current?.pause();
      previewAudio.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void onListVoices().then((result) => {
      if (cancelled) return;
      setVoices(result);
      const first = result[0];
      if (first) {
        setLocale(first.locale);
        setVoice(first.name);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onListVoices]);

  const languageName = useMemo(() => {
    let display: Intl.DisplayNames | null = null;
    try {
      display = new Intl.DisplayNames([uiLocale], { type: "language" });
    } catch {
      display = null;
    }
    return (code: string): string => {
      const bcp = code.replace("_", "-");
      try {
        return display?.of(bcp) ?? code;
      } catch {
        return code;
      }
    };
  }, [uiLocale]);

  const languageOptions = useMemo<SelectOption[]>(() => {
    if (!voices) return [];
    const seen = new Set<string>();
    const options: SelectOption[] = [];
    for (const item of voices) {
      if (seen.has(item.locale)) continue;
      seen.add(item.locale);
      options.push({ value: item.locale, label: languageName(item.locale) });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [voices, languageName]);

  const voiceOptions = useMemo<SelectOption[]>(() => {
    if (!voices) return [];
    return voices
      .filter((item) => item.locale === locale)
      .map((item) => ({ value: item.name, label: item.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [voices, locale]);

  const filteredCatalog = useMemo<readonly CatalogVoice[]>(() => {
    if (!catalog) return [];
    const query = manageQuery.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter((item) =>
      [
        item.languageEnglish,
        item.languageNative,
        item.country,
        item.region,
        item.name,
        item.id,
        item.languageCode,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [catalog, manageQuery]);

  const changeLocale = (next: string) => {
    setLocale(next);
    const firstVoice = voices?.find((item) => item.locale === next);
    setVoice(firstVoice?.name ?? "");
  };

  const openManage = () => {
    setMode("manage");
    if (catalog === null) {
      void onListAvailableVoices().then(setCatalog);
    }
  };

  const refreshInstalled = async () => {
    const [installed, available] = await Promise.all([onListVoices(), onListAvailableVoices()]);
    setVoices(installed);
    setCatalog(available);
    if (!installed.some((item) => item.name === voice)) {
      const first = installed[0];
      setLocale(first?.locale ?? "");
      setVoice(first?.name ?? "");
    }
  };

  const stopSample = () => {
    sampleAudio.current?.pause();
    sampleAudio.current = null;
    setPlayingSample(null);
  };

  const toggleSample = (item: CatalogVoice) => {
    if (playingSample === item.id) {
      stopSample();
      return;
    }
    stopSample();
    if (!item.sampleUrl) return;
    const audio = new Audio(item.sampleUrl);
    audio.onended = () => {
      setPlayingSample(null);
    };
    audio.onerror = () => {
      setPlayingSample(null);
    };
    sampleAudio.current = audio;
    setPlayingSample(item.id);
    void audio.play().catch(() => {
      setPlayingSample(null);
    });
  };

  const download = (voiceId: string) => {
    if (busyVoice !== null) return;
    setDownloadFailed(false);
    setProgress({ downloaded: 0, total: 0 });
    setBusyVoice(voiceId);
    void onDownloadVoice(voiceId, (downloaded, total) => {
      setProgress({ downloaded, total });
    })
      .then((ok) => {
        if (ok) return refreshInstalled();
        setDownloadFailed(true);
        return undefined;
      })
      .finally(() => {
        setBusyVoice(null);
      });
  };

  const remove = (voiceId: string) => {
    if (busyVoice !== null) return;
    setBusyVoice(voiceId);
    void onRemoveVoice(voiceId)
      .then((ok) => (ok ? refreshInstalled() : undefined))
      .finally(() => {
        setBusyVoice(null);
      });
  };

  const save = () => {
    if (text.trim() === "" || voice === "" || saving) return;
    setSaving(true);
    setFailed(false);
    setErrorMessage(null);
    void onAddTtsAudio(text.trim(), voice, fileNameFromText(text))
      .then((result) => {
        if (result.ok) {
          onClose();
        } else {
          setFailed(true);
          setErrorMessage(result.error);
        }
      })
      .catch((error: unknown) => {
        setFailed(true);
        setErrorMessage(String(error));
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const preview = () => {
    if (text.trim() === "" || voice === "" || previewing) return;
    previewAudio.current?.pause();
    setFailed(false);
    setErrorMessage(null);
    setPreviewing(true);
    void onPreviewVoice(text.trim(), voice)
      .then((dataUrl) => {
        const audio = new Audio(dataUrl);
        previewAudio.current = audio;
        audio.onended = () => {
          setPreviewing(false);
        };
        audio.onerror = () => {
          setPreviewing(false);
        };
        return audio.play();
      })
      .catch((error: unknown) => {
        setPreviewing(false);
        setFailed(true);
        setErrorMessage(String(error));
      });
  };

  const noVoices = voices !== null && voices.length === 0;
  const canSave = !saving && !noVoices && voice !== "" && text.trim() !== "";
  const canPreview = !previewing && !saving && !noVoices && voice !== "" && text.trim() !== "";

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t.ttsTitle}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{mode === "manage" ? t.ttsManageVoices : t.ttsTitle}</h2>
            <p className={styles.description}>
              {mode === "manage" ? t.ttsManageHint : t.ttsDescription}
            </p>
          </div>
          <IconButton aria-label={t.closeDialog} onClick={onClose}>
            <Icon name="close" size={18} />
          </IconButton>
        </header>

        <div className={styles.body}>
          {mode === "manage" ? (
            <>
              <TextInput
                type="search"
                value={manageQuery}
                placeholder={messages.common.searchPlaceholder}
                aria-label={messages.common.search}
                autoComplete="off"
                onChange={(event) => {
                  setManageQuery(event.currentTarget.value);
                }}
              />
              {catalog === null ? (
                <p className={styles.hint}>{t.ttsLoadingVoices}</p>
              ) : filteredCatalog.length === 0 ? (
                <p className={styles.hint}>
                  {catalog.length === 0 ? t.ttsNoCatalog : messages.common.noResults}
                </p>
              ) : (
                <div className={styles.voiceList}>
                  {filteredCatalog.map((item) => {
                    const isDownloading = busyVoice === item.id;
                    const percent =
                      isDownloading && progress.total > 0
                        ? Math.round((progress.downloaded / progress.total) * 100)
                        : null;
                    const languageLabel = item.country
                      ? `${item.languageEnglish} (${item.country})`
                      : item.languageEnglish;
                    const languageLine =
                      item.languageNative && item.languageNative !== item.languageEnglish
                        ? `${languageLabel} · ${item.languageNative}`
                        : languageLabel;
                    const detailLine = [
                      item.languageCode,
                      item.name,
                      item.quality,
                      formatSize(item.sizeBytes),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={item.id} className={styles.voiceRow}>
                        <span className={styles.voiceInfo}>
                          <span className={styles.voiceLang}>{languageLine}</span>
                          <span className={styles.voiceSub}>{detailLine}</span>
                          {isDownloading && percent !== null ? (
                            <span className={styles.progressTrack}>
                              <span
                                className={styles.progressFill}
                                style={{ width: `${String(percent)}%` }}
                              />
                            </span>
                          ) : null}
                        </span>
                        <span className={styles.voiceActions}>
                          {item.sampleUrl ? (
                            <IconButton
                              aria-label={t.ttsPreview}
                              onClick={() => {
                                toggleSample(item);
                              }}
                            >
                              <Icon name={playingSample === item.id ? "stop" : "play"} size={16} />
                            </IconButton>
                          ) : null}
                          {item.installed ? (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={busyVoice === item.id}
                              onClick={() => {
                                remove(item.id);
                              }}
                            >
                              {t.ttsRemove}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={busyVoice !== null}
                              onClick={() => {
                                download(item.id);
                              }}
                            >
                              {isDownloading
                                ? percent !== null
                                  ? `${String(percent)}%`
                                  : t.ttsDownloading
                                : t.ttsDownload}
                            </Button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {downloadFailed ? <Status tone="warning">{t.ttsDownloadFailed}</Status> : null}
            </>
          ) : voices === null ? (
            <p className={styles.hint}>{t.ttsLoadingVoices}</p>
          ) : noVoices ? (
            <div>
              <p className={styles.hint}>{t.ttsNoVoices}</p>
              <div className={styles.emptyActions}>
                <Button type="button" onClick={openManage}>
                  {t.ttsAddVoice}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.row}>
                <Field label={t.ttsLanguageLabel}>
                  <Select
                    items={languageOptions}
                    value={locale}
                    onValueChange={changeLocale}
                    aria-label={t.ttsLanguageLabel}
                    elevated
                  />
                </Field>
                <Field label={t.ttsVoiceLabel}>
                  <Select
                    items={voiceOptions}
                    value={voice}
                    onValueChange={setVoice}
                    aria-label={t.ttsVoiceLabel}
                    elevated
                  />
                </Field>
              </div>
              <Field label={t.ttsTextLabel}>
                <TextArea
                  rows={4}
                  value={text}
                  placeholder={t.ttsTextPlaceholder}
                  onChange={(event) => {
                    setText(event.currentTarget.value);
                  }}
                />
              </Field>
            </>
          )}
          {failed ? <Status tone="warning">{errorMessage ?? t.ttsFailed}</Status> : null}
        </div>

        <footer className={styles.footer}>
          {mode === "manage" ? (
            <div className={styles.footerActions}>
              <Button
                type="button"
                onClick={() => {
                  stopSample();
                  setMode("compose");
                }}
              >
                {messages.common.done}
              </Button>
            </div>
          ) : (
            <>
              {noVoices ? (
                <span />
              ) : (
                <Button type="button" variant="ghost" onClick={openManage}>
                  {t.ttsManageVoices}
                </Button>
              )}
              <div className={styles.footerActions}>
                <Button type="button" variant="ghost" disabled={!canPreview} onClick={preview}>
                  <Icon name="play" size={18} />
                  {previewing ? t.ttsSaving : t.ttsPreview}
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  {t.ttsCancel}
                </Button>
                <Button type="button" disabled={!canSave} onClick={save}>
                  {saving ? t.ttsSaving : t.ttsSave}
                </Button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
