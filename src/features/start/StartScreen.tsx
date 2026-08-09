import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/start/StartScreen.module.css";

interface StartScreenProps {
  readonly isDark: boolean;
  readonly onNewCourse: () => void;
  readonly onOpenCourse: () => void;
  readonly onIntegrations: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
}

export function StartScreen({
  isDark,
  onNewCourse,
  onOpenCourse,
  onIntegrations,
  onToggleTheme,
  onToggleLocale,
}: StartScreenProps) {
  const messages = useMessages();

  return (
    <main className={styles.hub}>
      <div className={styles.tools}>
        <IconButton aria-label={messages.start.integrations} onClick={onIntegrations}>
          <Icon name="integrations" size={18} />
        </IconButton>
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
        <p className={styles.note}>{messages.start.note}</p>
      </div>
    </main>
  );
}
