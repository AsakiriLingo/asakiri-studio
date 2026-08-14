import type { AvailableUpdate } from "@core/app-update";
import { useMessages } from "@shared/i18n";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/start/StartScreen.module.css";

interface StartScreenProps {
  readonly isDark: boolean;
  readonly update: AvailableUpdate | null;
  readonly updateInstalling: boolean;
  readonly showSupport: boolean;
  readonly onInstallUpdate: () => void;
  readonly onSupport: () => void;
  readonly onSupportLater: () => void;
  readonly onSupportDismiss: () => void;
  readonly onNewCourse: () => void;
  readonly onOpenCourse: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
}

export function StartScreen({
  isDark,
  update,
  updateInstalling,
  showSupport,
  onInstallUpdate,
  onSupport,
  onSupportLater,
  onSupportDismiss,
  onNewCourse,
  onOpenCourse,
  onToggleTheme,
  onToggleLocale,
}: StartScreenProps) {
  const messages = useMessages();
  const confirm = useConfirm();
  const t = messages.update;

  const reviewUpdate = async () => {
    if (!update || updateInstalling) return;
    const ok = await confirm({
      title: t.dialogTitle(update.version),
      description: update.notes.trim() === "" ? t.noNotes : update.notes,
      confirmLabel: t.installRestart,
    });
    if (ok) onInstallUpdate();
  };

  return (
    <main className={styles.hub}>
      <div className={styles.tools}>
        {update ? (
          <button
            type="button"
            className={styles.updateChip}
            disabled={updateInstalling}
            onClick={() => {
              void reviewUpdate();
            }}
          >
            <span className={styles.updateDot} aria-hidden="true" />
            {updateInstalling ? t.installing : t.available}
          </button>
        ) : null}
        <IconButton aria-label={messages.switchLanguage} onClick={onToggleLocale}>
          <Icon name="language" size={18} />
        </IconButton>
        <IconButton
          aria-label={isDark ? messages.common.useLightTheme : messages.common.useDarkTheme}
          onClick={onToggleTheme}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </IconButton>
      </div>
      <div className={styles.main}>
        <h1 className={styles.title}>{messages.start.title}</h1>
        <div className={styles.list} aria-label={messages.start.projectActions}>
          <button className={styles.row} type="button" onClick={onNewCourse}>
            <span className={styles.icon}>
              <Icon name="plus" size={18} />
            </span>
            <span>
              <span className={styles.name}>{messages.start.newCourseName}</span>
              <span className={styles.detail}>{messages.start.newCourseDetail}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
          <button className={styles.row} type="button" onClick={onOpenCourse}>
            <span className={styles.icon}>
              <Icon name="folder" size={18} />
            </span>
            <span>
              <span className={styles.name}>{messages.start.openCourseName}</span>
              <span className={styles.detail}>{messages.start.openCourseDetail}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
      {showSupport ? (
        <div className={styles.support} role="complementary" aria-label={messages.support.message}>
          <span className={styles.supportIcon} aria-hidden="true">
            <Icon name="heart" size={18} />
          </span>
          <p className={styles.supportMessage}>{messages.support.message}</p>
          <button type="button" className={styles.supportAction} onClick={onSupport}>
            {messages.support.action}
            <Icon name="external" size={16} />
          </button>
          <button type="button" className={styles.supportLater} onClick={onSupportLater}>
            {messages.support.later}
          </button>
          <button type="button" className={styles.supportDismiss} onClick={onSupportDismiss}>
            {messages.support.dismiss}
          </button>
        </div>
      ) : null}
    </main>
  );
}
