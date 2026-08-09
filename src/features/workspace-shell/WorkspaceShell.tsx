import type { ReactNode } from "react";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/workspace-shell/WorkspaceShell.module.css";

export type WorkspaceSection = "details" | "content" | "media" | "lessons";

interface NavLink {
  readonly key: WorkspaceSection;
  readonly label: string;
  readonly icon: IconName;
}

const NAV_LINKS: readonly NavLink[] = [
  { key: "details", label: "Course details", icon: "details" },
  { key: "content", label: "Content", icon: "content" },
  { key: "media", label: "Media", icon: "media" },
  { key: "lessons", label: "Lessons", icon: "lessons" },
];

export interface WorkspaceShellProps {
  readonly projectName: string;
  readonly projectLocation: string;
  readonly active: WorkspaceSection;
  readonly isDark: boolean;
  readonly onNavigate: (section: WorkspaceSection) => void;
  readonly onBack: () => void;
  readonly onToggleTheme: () => void;
  readonly children: ReactNode;
}

export function WorkspaceShell({
  projectName,
  projectLocation,
  active,
  isDark,
  onNavigate,
  onBack,
  onToggleTheme,
  children,
}: WorkspaceShellProps) {
  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar} aria-label="Project workspace">
        <div className={styles.projectIdentity}>
          <span className={styles.projectName}>{projectName}</span>
          <span className={styles.projectLocation}>{projectLocation}</span>
        </div>
        <div className={styles.utilities}>
          <IconButton aria-label="Back to Start" onClick={onBack}>
            <Icon name="back" size={18} />
          </IconButton>
          <IconButton
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
            onClick={onToggleTheme}
          >
            <Icon name={isDark ? "sun" : "moon"} size={18} />
          </IconButton>
        </div>
        <nav className={styles.nav} aria-label="Course areas">
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              type="button"
              className={styles.navItem}
              aria-current={active === link.key ? "page" : undefined}
              onClick={() => {
                onNavigate(link.key);
              }}
            >
              <Icon name={link.icon} size={18} />
              {link.label}
            </button>
          ))}
        </nav>
        <div className={styles.status}>Saved locally</div>
      </aside>
      <main className={styles.workSurface}>{children}</main>
    </div>
  );
}
