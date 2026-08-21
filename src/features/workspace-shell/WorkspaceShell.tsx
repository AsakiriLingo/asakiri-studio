import type { ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import { Flag, hasFlag } from "@shared/components/flag";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { ScrollArea } from "@shared/components/scroll-area";
import styles from "@features/workspace-shell/WorkspaceShell.module.css";

export type WorkspaceSection = "details" | "content" | "media" | "attribution" | "lessons";

interface NavLink {
  readonly key: WorkspaceSection;
  readonly label: string;
  readonly icon: IconName;
}

export interface WorkspaceShellProps {
  readonly projectName: string;
  readonly projectLocation: string;
  readonly flagCode?: string | undefined;
  readonly active: WorkspaceSection;
  readonly onNavigate: (section: WorkspaceSection) => void;
  readonly onBack: () => void;
  readonly children: ReactNode;
}

export function WorkspaceShell({
  projectName,
  projectLocation,
  flagCode,
  active,
  onNavigate,
  onBack,
  children,
}: WorkspaceShellProps) {
  const messages = useMessages();

  const navLinks: readonly NavLink[] = [
    { key: "details", label: messages.workspace.navDetails, icon: "details" },
    { key: "content", label: messages.workspace.navContent, icon: "content" },
    { key: "media", label: messages.workspace.navMedia, icon: "media" },
    { key: "attribution", label: messages.workspace.navAttribution, icon: "book" },
    { key: "lessons", label: messages.workspace.navLessons, icon: "lessons" },
  ];

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar} aria-label={messages.workspace.projectAria}>
        <div className={styles.projectIdentity}>
          {flagCode && hasFlag(flagCode) ? (
            <Flag code={flagCode} size={28} className={styles.projectMark} />
          ) : (
            <img
              className={styles.projectMark}
              src="/asakiri-mark.svg"
              alt=""
              width={28}
              height={28}
            />
          )}
          <div className={styles.projectCopy}>
            <span className={styles.projectName}>{projectName}</span>
            <span className={styles.projectLocation}>{projectLocation}</span>
          </div>
        </div>
        <div className={styles.utilities}>
          <IconButton aria-label={messages.common.backToStart} onClick={onBack}>
            <Icon name="back" size={18} />
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
              <span className={styles.navIcon}>
                <Icon name={link.icon} size={18} />
              </span>
              {link.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className={styles.workSurface}>
        <ScrollArea className={styles.workScroll} contentClassName={styles.workContent}>
          {children}
        </ScrollArea>
      </main>
    </div>
  );
}
