import type { AvailableUpdate } from "@core/app-update";
import type { RecentProject } from "@core/projects";
import { useFormat, useMessages } from "@shared/i18n";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Icon } from "@shared/components/icon";
import { Button } from "@shared/components/button";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/start/StartScreen.module.css";

interface StartScreenProps {
  readonly update: AvailableUpdate | null;
  readonly updateInstalling: boolean;
  readonly recentProjects: readonly RecentProject[];
  readonly showSupport: boolean;
  readonly onInstallUpdate: () => void;
  readonly onSupport: () => void;
  readonly onSupportLater: () => void;
  readonly onSupportDismiss: () => void;
  readonly onNewCourse: () => void;
  readonly onOpenCourse: () => void;
  readonly onOpenRecent: (id: string) => void;
  readonly onOpenSettings: () => void;
}

export function StartScreen({
  update,
  updateInstalling,
  recentProjects,
  showSupport,
  onInstallUpdate,
  onSupport,
  onSupportLater,
  onSupportDismiss,
  onNewCourse,
  onOpenCourse,
  onOpenRecent,
  onOpenSettings,
}: StartScreenProps) {
  const messages = useMessages();
  const format = useFormat();
  const confirm = useConfirm();
  const t = messages.update;

  const reviewUpdate = async () => {
    if (!update || updateInstalling) return;
    const ok = await confirm({
      title: format(t.dialogTitle, { version: update.version }),
      description: update.notes.trim() === "" ? t.noNotes : update.notes,
      confirmLabel: t.installRestart,
    });
    if (ok) onInstallUpdate();
  };

  return (
    <main className={styles.hub}>
      <div className={styles.bar}>
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
          <IconButton aria-label={messages.common.settings} onClick={onOpenSettings}>
            <Icon name="settings" size={18} />
          </IconButton>
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.brand}>
          <img className={styles.brandMark} src="/asakiri-mark.svg" alt="" width={32} height={32} />
          <span>
            Asakiri <strong>Studio</strong>
          </span>
        </div>
        <h1 className={styles.title}>{messages.start.title}</h1>
        <div className={styles.list} aria-label={messages.start.projectActions}>
          <button className={styles.row} type="button" onClick={onNewCourse}>
            <span className={[styles.tile, styles.tileBrand].join(" ")}>
              <Icon name="plus" size={18} />
            </span>
            <span>
              <span className={styles.name}>{messages.start.newCourseName}</span>
              <span className={styles.detail}>{messages.start.newCourseDetail}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
          <button className={styles.row} type="button" onClick={onOpenCourse}>
            <span className={[styles.tile, styles.tileAccent].join(" ")}>
              <Icon name="folder" size={18} />
            </span>
            <span>
              <span className={styles.name}>{messages.start.openCourseName}</span>
              <span className={styles.detail}>{messages.start.openCourseDetail}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        </div>
        {recentProjects.length > 0 ? (
          <section className={styles.recent} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.recentTitle}>
              {messages.start.recentTitle}
            </h2>
            <div className={styles.list}>
              {recentProjects.slice(0, 3).map((recent) => (
                <button
                  key={recent.id}
                  className={styles.row}
                  type="button"
                  onClick={() => {
                    onOpenRecent(recent.id);
                  }}
                >
                  <span className={styles.icon}>
                    <Icon name="book" size={18} />
                  </span>
                  <span>
                    <span className={styles.name}>{recent.name}</span>
                    <span className={styles.detail}>{recent.locationLabel}</span>
                  </span>
                  <Icon name="arrow" size={18} />
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      {showSupport ? (
        <div className={styles.support} role="complementary" aria-label={messages.support.message}>
          <span className={styles.supportIcon} aria-hidden="true">
            <Icon name="heart" size={18} />
          </span>
          <p className={styles.supportMessage}>{messages.support.message}</p>
          <Button size="sm" onClick={onSupport}>
            {messages.support.action}
            <Icon name="external" size={16} />
          </Button>
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
