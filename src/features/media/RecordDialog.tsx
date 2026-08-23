import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { Status } from "@shared/components/status";
import styles from "@features/media/RecordDialog.module.css";

export interface RecordDialogProps {
  readonly onClose: () => void;
  readonly onAddRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
  ) => Promise<ProjectWriteResult | null>;
}

type Phase = "idle" | "recording" | "recorded";

const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function extForMime(mimeType: string): string {
  switch (mimeType.split(";")[0]?.trim()) {
    case "audio/mp4":
      return "m4a";
    case "audio/aac":
      return "aac";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/wave":
    case "audio/x-wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      return "m4a";
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

export function RecordDialog({ onClose, onAddRecording }: RecordDialogProps) {
  const messages = useMessages();
  const t = messages.media;

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<"denied" | "unsupported" | "failed" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const revokeUrl = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      revokeUrl();
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    const mediaDevices = (navigator as { mediaDevices?: MediaDevices }).mediaDevices;
    if (typeof MediaRecorder === "undefined" || !mediaDevices) {
      setError("unsupported");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("denied");
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/mp4";
      const blob = new Blob(chunksRef.current, { type });
      stopStream();
      revokeUrl();
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPreviewUrl(url);
      setPhase("recorded");
    };
    recorderRef.current = recorder;
    recorder.start();
    setElapsed(0);
    setPhase("recording");
    timerRef.current = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
  };

  const stopRecording = () => {
    clearTimer();
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const togglePlay = () => {
    const element = audioRef.current;
    if (!element) return;
    if (playing) {
      element.pause();
      element.currentTime = 0;
      setPlaying(false);
      return;
    }
    setPlaying(true);
    void element.play().catch(() => {
      setPlaying(false);
    });
  };

  const discard = () => {
    audioRef.current?.pause();
    setPlaying(false);
    revokeUrl();
    blobRef.current = null;
    setPreviewUrl(null);
    setElapsed(0);
    setError(null);
    setPhase("idle");
  };

  const save = () => {
    const blob = blobRef.current;
    if (!blob || saving) return;
    setSaving(true);
    setError(null);
    void blob
      .arrayBuffer()
      .then((buffer) => {
        const mimeType = (blob.type.split(";")[0]?.trim() ?? "") || "audio/mp4";
        return onAddRecording(new Uint8Array(buffer), mimeType, extForMime(blob.type));
      })
      .then((result) => {
        if (result?.status === "saved") {
          onClose();
        } else {
          setError("failed");
        }
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.overlay} />
        <Dialog.Popup className={styles.dialog}>
          <header className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>{t.recordTitle}</Dialog.Title>
              <Dialog.Description className={styles.description}>
                {t.recordDescription}
              </Dialog.Description>
            </div>
            <IconButton aria-label={t.closeDialog} onClick={onClose}>
              <Icon name="close" size={18} />
            </IconButton>
          </header>

          <div className={styles.body}>
            {error === "unsupported" ? (
              <Status tone="warning">{t.recordUnsupported}</Status>
            ) : error === "denied" ? (
              <Status tone="warning">{t.recordDenied}</Status>
            ) : null}

            <div className={styles.stage}>
              <span
                className={phase === "recording" ? styles.pulseActive : styles.pulse}
                aria-hidden="true"
              >
                <Icon name="mic" size={32} />
              </span>
              <span className={styles.time}>{formatTime(elapsed)}</span>
              <span className={styles.stageHint}>
                {phase === "recording"
                  ? t.recordListening
                  : phase === "recorded"
                    ? t.recordReady
                    : t.recordHint}
              </span>
            </div>

            {phase === "recorded" && previewUrl ? (
              <div className={styles.preview}>
                <button
                  type="button"
                  className={styles.playButton}
                  aria-label={playing ? t.recordStopPlayback : t.recordPlay}
                  onClick={togglePlay}
                >
                  <Icon name={playing ? "stop" : "play"} size={22} />
                </button>
                <audio
                  ref={audioRef}
                  src={previewUrl}
                  preload="auto"
                  onEnded={() => {
                    setPlaying(false);
                  }}
                />
              </div>
            ) : null}

            {error === "failed" ? <Status tone="error">{t.recordFailed}</Status> : null}
          </div>

          <footer className={styles.footer}>
            {phase === "recorded" ? (
              <Button type="button" variant="ghost" onClick={discard}>
                <Icon name="mic" size={18} />
                {t.recordAgain}
              </Button>
            ) : (
              <span />
            )}
            <div className={styles.footerActions}>
              <Button type="button" variant="secondary" onClick={onClose}>
                {t.recordCancel}
              </Button>
              {phase === "recording" ? (
                <Button type="button" onClick={stopRecording}>
                  <Icon name="stop" size={18} />
                  {t.recordStop}
                </Button>
              ) : phase === "recorded" ? (
                <Button type="button" disabled={saving} onClick={save}>
                  {saving ? t.recordSaving : t.recordSave}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    void startRecording();
                  }}
                >
                  <Icon name="mic" size={18} />
                  {t.recordStart}
                </Button>
              )}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
