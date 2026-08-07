import { useState, type ReactNode } from "react";
import { ArrowLeft02Icon, BookOpenTextIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { WorkspaceArea, WorkspaceMessages } from "@features/workspace/i18n/workspace-messages";
import { Button } from "@shared/components/button";
import styles from "@features/workspace/components/WorkspacePage.module.css";

interface WorkspacePageProps {
  readonly messages: WorkspaceMessages;
  readonly onBack: () => void;
  readonly projectName: string;
  readonly workspaceActions?: ReactNode;
}

const areas: readonly { readonly id: WorkspaceArea; readonly icon: IconSvgElement }[] = [
  { id: "content", icon: BookOpenTextIcon },
  { id: "media", icon: Image01Icon },
];

export function WorkspacePage({
  messages,
  onBack,
  projectName,
  workspaceActions,
}: WorkspacePageProps) {
  const [activeArea, setActiveArea] = useState<WorkspaceArea>("content");
  const emptyState = messages.emptyStates[activeArea];

  return (
    <main className={styles.workspace}>
      <aside className={styles.sidebar}>
        <strong className={styles.projectName} title={projectName}>
          {projectName}
        </strong>

        <nav className={styles.navigation} aria-label={messages.navigationLabel}>
          {areas.map((area) => (
            <Button
              aria-current={activeArea === area.id ? "page" : undefined}
              className={styles.navigationItem}
              key={area.id}
              onClick={() => {
                setActiveArea(area.id);
              }}
              size="sm"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden="true" icon={area.icon} size={20} strokeWidth={1.75} />
              <span>{messages.areas[area.id]}</span>
            </Button>
          ))}
        </nav>

        <div className={styles.utilities}>
          <Button
            aria-label={messages.backToProjects}
            className={styles.backButton}
            onClick={onBack}
            size="sm"
            variant="ghost"
          >
            <HugeiconsIcon aria-hidden="true" icon={ArrowLeft02Icon} size={18} strokeWidth={1.75} />
            <span>{messages.backToProjects}</span>
          </Button>
          {workspaceActions && <div className={styles.workspaceActions}>{workspaceActions}</div>}
        </div>
      </aside>

      <section className={styles.workSurface} aria-labelledby="workspace-area-title">
        <div className={styles.emptyState}>
          <h1 id="workspace-area-title">{emptyState.title}</h1>
          <p>{emptyState.description}</p>
        </div>
      </section>
    </main>
  );
}
