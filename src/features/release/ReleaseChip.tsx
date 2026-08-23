import { Popover } from "@base-ui/react/popover";
import type { ReleaseHistoryEntry } from "@core/packaging";
import { useFormat, useMessages } from "@shared/i18n";
import styles from "@features/release/ReleaseChip.module.css";

export type ReleaseChipStatus = "idle" | "pending" | "rebuilding" | "upToDate" | "error";

export interface ReleaseChipProps {
  readonly status: ReleaseChipStatus;
  readonly revision: number | null;
  readonly version: string | null;
  readonly history: readonly ReleaseHistoryEntry[];
  readonly uploadedMark: string | null;
  readonly changedSinceUpload: number;
  readonly onMarkUploaded: (entryId: string | null) => void;
  readonly onOpenFolder: () => void;
}

export function ReleaseChip({
  status,
  revision,
  version,
  history,
  uploadedMark,
  changedSinceUpload,
  onMarkUploaded,
  onOpenFolder,
}: ReleaseChipProps) {
  const messages = useMessages();
  const format = useFormat();
  const release = messages.release;

  const label =
    status === "pending"
      ? release.chipPending
      : status === "rebuilding"
        ? release.chipRebuilding
        : status === "error"
          ? release.chipError
          : revision === null
            ? release.chipNotBuilt
            : version !== null
              ? format(release.version, { version })
              : release.chipUpToDate;

  const tone =
    status === "error"
      ? styles.error
      : status === "rebuilding"
        ? styles.busy
        : status === "pending"
          ? styles.pending
          : undefined;
  const chipClass = [styles.chip, tone].filter(Boolean).join(" ");

  return (
    <Popover.Root>
      <Popover.Trigger className={chipClass}>
        <span className={styles.dot} aria-hidden="true" />
        <span>{label}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className={styles.popup} aria-label={release.historyTitle}>
            <div className={styles.header}>
              <span className={styles.title}>{release.historyTitle}</span>
              <button type="button" className={styles.action} onClick={onOpenFolder}>
                {release.openFolder}
              </button>
            </div>

            {changedSinceUpload > 0 ? (
              <p className={styles.summary}>
                {format(release.changedSinceUpload, { count: changedSinceUpload })}
              </p>
            ) : null}

            {history.length === 0 ? (
              <p className={styles.empty}>{release.historyEmpty}</p>
            ) : (
              <ul className={styles.history}>
                {history.map((entry) => (
                  <li key={entry.id} className={styles.entry}>
                    <div className={styles.entryHead}>
                      <span className={styles.entryTitle}>
                        {format(release.revision, { revision: entry.revision })} · {entry.version}
                      </span>
                      <button
                        type="button"
                        className={styles.action}
                        aria-pressed={uploadedMark === entry.id}
                        onClick={() => {
                          onMarkUploaded(uploadedMark === entry.id ? null : entry.id);
                        }}
                      >
                        {uploadedMark === entry.id ? release.markedUploaded : release.markUploaded}
                      </button>
                    </div>
                    {entry.addedOrReplaced.length > 0 ? (
                      <p className={styles.files}>
                        {release.added}:{" "}
                        {entry.addedOrReplaced.map((file) => file.label).join(", ")}
                      </p>
                    ) : null}
                    {entry.deleted.length > 0 ? (
                      <p className={styles.files}>
                        {release.deleted}: {entry.deleted.map((file) => file.label).join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
