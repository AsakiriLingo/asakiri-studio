import { useEffect, useMemo, useState } from "react";
import type { ProjectWriteResult } from "@core/project-writing";
import type { TtsVoice } from "@core/tts";
import { useLocale, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Field, TextArea } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Select, type SelectOption } from "@shared/components/select";
import { Status } from "@shared/components/status";
import styles from "@features/media/TtsDialog.module.css";

export interface TtsDialogProps {
  readonly onClose: () => void;
  readonly onListVoices: () => Promise<readonly TtsVoice[]>;
  readonly onAddTtsAudio: (
    text: string,
    voice: string,
    fileName: string,
  ) => Promise<ProjectWriteResult | null>;
}

function fileNameFromText(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base === "" ? "tts-audio" : base}.m4a`;
}

export function TtsDialog({ onClose, onListVoices, onAddTtsAudio }: TtsDialogProps) {
  const messages = useMessages();
  const uiLocale = useLocale();
  const t = messages.media;

  const [voices, setVoices] = useState<readonly TtsVoice[] | null>(null);
  const [locale, setLocale] = useState("");
  const [voice, setVoice] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const synth = typeof window === "undefined" ? null : window.speechSynthesis;

  useEffect(() => {
    return () => {
      synth?.cancel();
    };
  }, [synth]);

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

  const changeLocale = (next: string) => {
    setLocale(next);
    const firstVoice = voices?.find((item) => item.locale === next);
    setVoice(firstVoice?.name ?? "");
  };

  const save = () => {
    if (text.trim() === "" || voice === "" || saving) return;
    synth?.cancel();
    setSpeaking(false);
    setSaving(true);
    setFailed(false);
    void onAddTtsAudio(text.trim(), voice, fileNameFromText(text))
      .then((result) => {
        if (result?.status === "saved") {
          onClose();
        } else {
          setFailed(true);
        }
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const stopPreview = () => {
    synth?.cancel();
    setSpeaking(false);
  };

  const togglePreview = () => {
    if (!synth || text.trim() === "") return;
    if (speaking) {
      stopPreview();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = locale.replace("_", "-");
    const match = synth.getVoices().find((item) => item.name === voice);
    if (match) utterance.voice = match;
    utterance.onend = () => {
      setSpeaking(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
    };
    setSpeaking(true);
    synth.speak(utterance);
  };

  const noVoices = voices !== null && voices.length === 0;
  const canSave = !saving && !noVoices && voice !== "" && text.trim() !== "";
  const canPreview = synth !== null && !noVoices && text.trim() !== "";

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
            <h2 className={styles.title}>{t.ttsTitle}</h2>
            <p className={styles.description}>{t.ttsDescription}</p>
          </div>
          <IconButton aria-label={t.closeDialog} onClick={onClose}>
            <Icon name="close" size={18} />
          </IconButton>
        </header>

        <div className={styles.body}>
          {voices === null ? (
            <p className={styles.hint}>{t.ttsLoadingVoices}</p>
          ) : noVoices ? (
            <p className={styles.hint}>{t.ttsNoVoices}</p>
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
          {failed ? <Status tone="warning">{t.ttsFailed}</Status> : null}
        </div>

        <footer className={styles.footer}>
          <Button type="button" variant="ghost" disabled={!canPreview} onClick={togglePreview}>
            <Icon name={speaking ? "stop" : "play"} size={18} />
            {speaking ? t.ttsStopPreview : t.ttsPreview}
          </Button>
          <div className={styles.footerActions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.ttsCancel}
            </Button>
            <Button type="button" disabled={!canSave} onClick={save}>
              {saving ? t.ttsSaving : t.ttsSave}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
