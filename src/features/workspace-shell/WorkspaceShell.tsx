import type { ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { ScrollArea } from "@shared/components/scroll-area";
import styles from "@features/workspace-shell/WorkspaceShell.module.css";

export type WorkspaceSection = "details" | "content" | "media" | "lessons";

interface NavLink {
  readonly key: WorkspaceSection;
  readonly label: string;
  readonly icon: IconName;
}

export interface WorkspaceShellProps {
  readonly projectName: string;
  readonly projectLocation: string;
  readonly active: WorkspaceSection;
  readonly isDark: boolean;
  readonly onNavigate: (section: WorkspaceSection) => void;
  readonly onBack: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
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
  onToggleLocale,
  children,
}: WorkspaceShellProps) {
  const messages = useMessages();

  const navLinks: readonly NavLink[] = [
    { key: "details", label: messages.workspace.navDetails, icon: "details" },
    { key: "content", label: messages.workspace.navContent, icon: "content" },
    { key: "media", label: messages.workspace.navMedia, icon: "media" },
    { key: "lessons", label: messages.workspace.navLessons, icon: "lessons" },
  ];

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar} aria-label={messages.workspace.projectAria}>
        <div className={styles.projectIdentity}>
          <span className={styles.projectName}>{projectName}</span>
          <span className={styles.projectLocation}>{projectLocation}</span>
        </div>
        <div className={styles.utilities}>
          <IconButton aria-label={messages.common.backToStart} onClick={onBack}>
            <Icon name="back" size={18} />
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
        <nav className={styles.nav} aria-label={messages.workspace.areasAria}>
          {navLinks.map((link) => (
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
        <div className={styles.status}>{messages.common.savedLocally}</div>
      </aside>
      <main className={styles.workSurface}>
        <ScrollArea className={styles.workScroll} contentClassName={styles.workContent}>
          {children}
        </ScrollArea>
      </main>
    </div>
  );
}
