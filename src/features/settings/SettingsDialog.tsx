import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
import type { AvailableUpdate } from "@core/app-update";
import type { CatalogVoice, DownloadProgress } from "@core/tts";
import { localeOptions, useFormat, useMessages } from "@shared/i18n";
import type { Locale } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { TextInput } from "@shared/components/form";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Select } from "@shared/components/select";
import { Status } from "@shared/components/status";
import styles from "@features/settings/SettingsDialog.module.css";

export type ThemePreference = "system" | "light" | "dark";

type SettingsSection = "appearance" | "voices" | "updates" | "general" | "about";

const PRIVACY_URL = "https://www.asakiri.com/privacy";
const TERMS_URL = "https://www.asakiri.com/terms";

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly themePreference: ThemePreference;
  readonly onThemePreferenceChange: (preference: ThemePreference) => void;
  readonly locale: Locale;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly version: string;
  readonly update: AvailableUpdate | null;
  readonly updateInstalling: boolean;
  readonly checkForUpdates: () => Promise<AvailableUpdate | null>;
  readonly onInstallUpdate: () => void;
  readonly autoUpdate: boolean;
  readonly onAutoUpdateChange: (enabled: boolean) => void;
  readonly supportPromptEnabled: boolean;
  readonly onSupportPromptChange: (enabled: boolean) => void;
  readonly recentCount: number;
  readonly onClearRecents: () => void;
  readonly onSupport: () => void;
  readonly onOpenExternal: (url: string) => void;
  readonly listAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly downloadVoice: (voiceId: string, onProgress?: DownloadProgress) => Promise<boolean>;
  readonly removeVoice: (voiceId: string) => Promise<boolean>;
}

function isThemePreference(value: string): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function formatSize(bytes: number): string {
  return `${String(Math.max(1, Math.round(bytes / 1_000_000)))} MB`;
}

function VoiceManager({
  listAvailableVoices,
  downloadVoice,
  removeVoice,
}: {
  readonly listAvailableVoices: () => Promise<readonly CatalogVoice[]>;
  readonly downloadVoice: (voiceId: string, onProgress?: DownloadProgress) => Promise<boolean>;
  readonly removeVoice: (voiceId: string) => Promise<boolean>;
}) {
  const messages = useMessages();
  const t = messages.media;
  const [catalog, setCatalog] = useState<readonly CatalogVoice[] | null>(null);
  const [query, setQuery] = useState("");
  const [busyVoice, setBusyVoice] = useState<string | null>(null);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [downloadFailed, setDownloadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listAvailableVoices().then((result) => {
      if (!cancelled) setCatalog(result);
    });
    return () => {
      cancelled = true;
    };
  }, [listAvailableVoices]);

  const filtered = useMemo<readonly CatalogVoice[]>(() => {
    if (!catalog) return [];
    const term = query.trim().toLowerCase();
    const matched = term
      ? catalog.filter((item) =>
          [
            item.languageEnglish,
            item.languageNative,
            item.country,
            item.name,
            item.languageCode,
          ].some((value) => value.toLowerCase().includes(term)),
        )
      : catalog;
    return [...matched].sort((a, b) => Number(b.installed) - Number(a.installed));
  }, [catalog, query]);

  const refresh = async () => {
    const next = await listAvailableVoices();
    setCatalog(next);
  };

  const download = (voiceId: string) => {
    if (busyVoice !== null) return;
    setDownloadFailed(false);
    setProgress({ downloaded: 0, total: 0 });
    setBusyVoice(voiceId);
    void downloadVoice(voiceId, (downloaded, total) => {
      setProgress({ downloaded, total });
    })
      .then((ok) => {
        if (ok) return refresh();
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
    void removeVoice(voiceId)
      .then((ok) => (ok ? refresh() : undefined))
      .finally(() => {
        setBusyVoice(null);
      });
  };

  return (
    <>
      <p className={styles.version}>{messages.settings.voicesHint}</p>
      <TextInput
        type="search"
        value={query}
        placeholder={messages.common.searchPlaceholder}
        aria-label={messages.common.search}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.currentTarget.value);
        }}
      />
      {catalog === null ? (
        <p className={styles.note}>{t.ttsLoadingVoices}</p>
      ) : filtered.length === 0 ? (
        <p className={styles.note}>
          {catalog.length === 0 ? t.ttsNoCatalog : messages.common.noResults}
        </p>
      ) : (
        <div className={styles.voiceList}>
          {filtered.map((item) => {
            const isDownloading = busyVoice === item.id;
            const percent =
              isDownloading && progress.total > 0
                ? Math.round((progress.downloaded / progress.total) * 100)
                : null;
            const languageLabel = item.country
              ? `${item.languageEnglish} (${item.country})`
              : item.languageEnglish;
            const detail = [item.name, item.quality, formatSize(item.sizeBytes)]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={item.id} className={styles.voiceRow}>
                <span className={styles.voiceInfo}>
                  <span className={styles.voiceLang}>{languageLabel}</span>
                  <span className={styles.voiceSub}>{detail}</span>
                  {isDownloading && percent !== null ? (
                    <span className={styles.progressTrack}>
                      <span
                        className={styles.progressFill}
                        style={{ width: `${String(percent)}%` }}
                      />
                    </span>
                  ) : null}
                </span>
                {item.installed ? (
                  <Button
                    variant="ghost"
                    size="compact"
                    disabled={busyVoice === item.id}
                    onClick={() => {
                      remove(item.id);
                    }}
                  >
                    {t.ttsRemove}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="compact"
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
              </div>
            );
          })}
        </div>
      )}
      {downloadFailed ? <Status tone="error">{t.ttsDownloadFailed}</Status> : null}
    </>
  );
}

export function SettingsDialog({
  open,
  onClose,
  themePreference,
  onThemePreferenceChange,
  locale,
  onLocaleChange,
  version,
  update,
  updateInstalling,
  checkForUpdates,
  onInstallUpdate,
  autoUpdate,
  onAutoUpdateChange,
  supportPromptEnabled,
  onSupportPromptChange,
  recentCount,
  onClearRecents,
  onSupport,
  onOpenExternal,
  listAvailableVoices,
  downloadVoice,
  removeVoice,
}: SettingsDialogProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.settings;
  const languages = localeOptions();
  const [active, setActive] = useState<SettingsSection>("general");
  const [checking, setChecking] = useState(false);
  const [checkedClean, setCheckedClean] = useState(false);

  const themeItems = [
    { value: "system", label: t.themeSystem },
    { value: "light", label: t.themeLight },
    { value: "dark", label: t.themeDark },
  ];

  const sections: readonly {
    readonly key: SettingsSection;
    readonly label: string;
    readonly icon: IconName;
  }[] = [
    { key: "general", label: t.general, icon: "settings" },
    { key: "appearance", label: t.appearance, icon: "palette" },
    { key: "voices", label: t.voices, icon: "audio" },
    { key: "updates", label: t.updates, icon: "sparkles" },
    { key: "about", label: t.about, icon: "heart" },
  ];

  const runCheck = async () => {
    setChecking(true);
    setCheckedClean(false);
    const result = await checkForUpdates();
    setChecking(false);
    setCheckedClean(result === null);
  };

  const activeLabel = sections.find((section) => section.key === active)?.label ?? t.title;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <nav className={styles.sidebar} aria-label={t.title}>
            <Dialog.Title className={styles.sidebarHeading}>{t.title}</Dialog.Title>
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={styles.navItem}
                aria-current={active === section.key ? "page" : undefined}
                onClick={() => {
                  setActive(section.key);
                }}
              >
                <Icon name={section.icon} size={18} />
                {section.label}
              </button>
            ))}
          </nav>

          <div className={styles.pane}>
            <header className={styles.paneHeader}>
              <h3 className={styles.paneTitle}>{activeLabel}</h3>
              <IconButton aria-label={t.close} onClick={onClose}>
                <Icon name="close" size={18} />
              </IconButton>
            </header>

            <div className={styles.paneBody}>
              {active === "appearance" ? (
                <>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>{t.theme}</span>
                    <Select
                      className={styles.control}
                      items={themeItems}
                      value={themePreference}
                      aria-label={t.theme}
                      elevated
                      onValueChange={(next) => {
                        if (isThemePreference(next)) onThemePreferenceChange(next);
                      }}
                    />
                  </div>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>{t.language}</span>
                    <Select
                      className={styles.control}
                      items={languages}
                      value={locale}
                      aria-label={t.language}
                      elevated
                      onValueChange={(next) => {
                        const picked = languages.find((entry) => entry.value === next);
                        if (picked) onLocaleChange(picked.value);
                      }}
                    />
                  </div>
                </>
              ) : active === "voices" ? (
                <VoiceManager
                  listAvailableVoices={listAvailableVoices}
                  downloadVoice={downloadVoice}
                  removeVoice={removeVoice}
                />
              ) : active === "updates" ? (
                <>
                  <p className={styles.version}>{format(t.version, { version: version || "—" })}</p>
                  <div className={styles.updateRow}>
                    <Button
                      variant="secondary"
                      size="compact"
                      disabled={checking || updateInstalling}
                      onClick={() => {
                        void runCheck();
                      }}
                    >
                      {checking ? t.checking : t.checkUpdates}
                    </Button>
                    {update ? (
                      <Button size="compact" disabled={updateInstalling} onClick={onInstallUpdate}>
                        {updateInstalling
                          ? messages.update.installing
                          : messages.update.installRestart}
                      </Button>
                    ) : null}
                  </div>
                  {update ? (
                    <p className={styles.note}>
                      {format(t.updateReady, { version: update.version })}
                    </p>
                  ) : checkedClean ? (
                    <p className={styles.note}>{t.upToDate}</p>
                  ) : null}
                  <label className={styles.toggleRow}>
                    <span className={styles.rowLabel}>{t.autoUpdate}</span>
                    <Switch.Root
                      className={styles.switch}
                      checked={autoUpdate}
                      onCheckedChange={onAutoUpdateChange}
                    >
                      <Switch.Thumb className={styles.switchThumb} />
                    </Switch.Root>
                  </label>
                </>
              ) : active === "general" ? (
                <>
                  <label className={styles.toggleRow}>
                    <span className={styles.rowLabel}>{t.supportPrompt}</span>
                    <Switch.Root
                      className={styles.switch}
                      checked={supportPromptEnabled}
                      onCheckedChange={onSupportPromptChange}
                    >
                      <Switch.Thumb className={styles.switchThumb} />
                    </Switch.Root>
                  </label>
                  <div className={styles.row}>
                    <span className={styles.rowLabel}>
                      {recentCount > 0 ? t.clearRecent : t.recentEmpty}
                    </span>
                    <Button
                      variant="secondary"
                      size="compact"
                      disabled={recentCount === 0}
                      onClick={onClearRecents}
                    >
                      <Icon name="trash" size={16} />
                      {t.clearRecent}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.version}>{format(t.version, { version: version || "—" })}</p>
                  <div className={styles.links}>
                    <button type="button" className={styles.link} onClick={onSupport}>
                      {t.support}
                      <Icon name="external" size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() => {
                        onOpenExternal(PRIVACY_URL);
                      }}
                    >
                      {t.privacy}
                      <Icon name="external" size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() => {
                        onOpenExternal(TERMS_URL);
                      }}
                    >
                      {t.terms}
                      <Icon name="external" size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
