import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/start/StartScreen.module.css";

interface StartScreenProps {
  readonly isDark: boolean;
  readonly onNewCourse: () => void;
  readonly onOpenCourse: () => void;
  readonly onIntegrations: () => void;
  readonly onToggleTheme: () => void;
}

export function StartScreen({
  isDark,
  onNewCourse,
  onOpenCourse,
  onIntegrations,
  onToggleTheme,
}: StartScreenProps) {
  return (
    <main className={styles.hub}>
      <div className={styles.tools}>
        <IconButton aria-label="Integrations" onClick={onIntegrations}>
          <Icon name="integrations" size={18} />
        </IconButton>
        <IconButton
          aria-label={isDark ? "Use light theme" : "Use dark theme"}
          onClick={onToggleTheme}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </IconButton>
      </div>
      <div className={styles.main}>
        <h1 className={styles.title}>Start</h1>
        <div className={styles.list} aria-label="Project actions">
          <button className={styles.row} type="button" onClick={onNewCourse}>
            <span className={styles.icon}>
              <Icon name="plus" size={18} />
            </span>
            <span>
              <span className={styles.name}>New course</span>
              <span className={styles.detail}>Create a local project folder</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
          <button className={styles.row} type="button" onClick={onOpenCourse}>
            <span className={styles.icon}>
              <Icon name="folder" size={18} />
            </span>
            <span>
              <span className={styles.name}>Open course</span>
              <span className={styles.detail}>Choose an existing Asakiri project</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        </div>
        <p className={styles.note}>
          Projects stay on this device. Studio reads and writes the selected folder directly.
        </p>
      </div>
    </main>
  );
}
