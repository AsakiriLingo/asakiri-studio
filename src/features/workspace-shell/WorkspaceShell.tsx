import type { ReactNode } from "react";
import { useMessages } from "@shared/i18n";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { ScrollArea } from "@shared/components/scroll-area";
import { Tooltip, TooltipProvider } from "@shared/components/tooltip";
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
  readonly active: WorkspaceSection;
  readonly onNavigate: (section: WorkspaceSection) => void;
  readonly onBack: () => void;
  readonly onOpenSettings: () => void;
  readonly flush?: boolean;
  readonly children: ReactNode;
}

export function WorkspaceShell({
  projectName,
  projectLocation,
  active,
  onNavigate,
  onBack,
  onOpenSettings,
  flush = false,
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
      <header
        className={styles.header}
        aria-label={messages.workspace.projectAria}
        data-tauri-drag-region
      >
        <div className={styles.identity} title={projectLocation}>
          <span className={styles.projectName}>{projectName}</span>
        </div>
        <TooltipProvider>
          <nav className={styles.nav} aria-label={messages.workspace.areasAria}>
            {navLinks.map((link) => (
              <Tooltip key={link.key} content={link.label}>
                <button
                  type="button"
                  className={styles.navItem}
                  aria-current={active === link.key ? "page" : undefined}
                  aria-label={link.label}
                  onClick={() => {
                    onNavigate(link.key);
                  }}
                >
                  <span className={styles.navIcon}>
                    <Icon name={link.icon} size={18} />
                  </span>
                </button>
              </Tooltip>
            ))}
          </nav>
        </TooltipProvider>
        <div className={styles.utilities}>
          <IconButton size="sm" aria-label={messages.common.backToStart} onClick={onBack}>
            <Icon name="back" size={18} />
          </IconButton>
          <IconButton size="sm" aria-label={messages.common.settings} onClick={onOpenSettings}>
            <Icon name="settings" size={18} />
          </IconButton>
        </div>
      </header>
      <main className={styles.workSurface}>
        {flush ? (
          children
        ) : (
          <ScrollArea className={styles.workScroll} contentClassName={styles.workContent}>
            {children}
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
