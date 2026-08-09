import { useState, type ReactNode } from "react";
import { WorkSurfaceHeader } from "@features/workspace/components/WorkSurfaceHeader";
import type { WorkspaceArea, WorkspaceMessages } from "@features/workspace/i18n/workspace-messages";
import { Button } from "@shared/components/button";
import { Icon, type IconName } from "@shared/components/icon";
import styles from "@features/workspace/components/WorkspacePage.module.css";

interface WorkspacePageProps {
  readonly messages: WorkspaceMessages;
  readonly onBack: () => void;
  readonly projectName: string;
  readonly contentSlot?: ReactNode;
  readonly lessonsSlot?: ReactNode;
  readonly workspaceActions?: ReactNode;
}

const areas: readonly { readonly id: WorkspaceArea; readonly icon: IconName }[] = [
  { id: "content", icon: "book" },
  { id: "media", icon: "image" },
  { id: "lessons", icon: "teacher" },
];

export function WorkspacePage({
  messages,
  onBack,
  projectName,
  contentSlot,
  lessonsSlot,
  workspaceActions,
}: WorkspacePageProps) {
  const [activeArea, setActiveArea] = useState<WorkspaceArea>("content");
  const emptyState = messages.emptyStates[activeArea];
  const slots: Partial<Record<WorkspaceArea, ReactNode>> = {
    content: contentSlot,
    lessons: lessonsSlot,
  };
  const activeSlot = slots[activeArea];

  const areaActions: Partial<Record<WorkspaceArea, ReactNode>> = {
    content: (
      <Button disabled focusableWhenDisabled size="sm" variant="primary">
        <Icon aria-hidden="true" name="plus" size={18} />
        <span>{messages.contentActions.createContent}</span>
      </Button>
    ),
    media: (
      <Button disabled focusableWhenDisabled size="sm" variant="primary">
        <Icon aria-hidden="true" name="upload" size={18} />
        <span>{messages.mediaActions.importMedia}</span>
      </Button>
    ),
  };
  const activeActions = areaActions[activeArea];

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
              <Icon aria-hidden="true" name={area.icon} size={20} />
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
            <Icon aria-hidden="true" name="arrow-left" size={18} />
            <span>{messages.backToProjects}</span>
          </Button>
          {workspaceActions && <div className={styles.workspaceActions}>{workspaceActions}</div>}
        </div>
      </aside>

      <section className={styles.workSurface} aria-labelledby="workspace-area-title">
        {activeActions ? (
          <>
            <WorkSurfaceHeader
              title={emptyState.title}
              titleId="workspace-area-title"
              actions={activeActions}
            />
            {activeSlot ?? (
              <div className={styles.emptyState}>
                <p>{emptyState.description}</p>
              </div>
            )}
          </>
        ) : activeSlot ? (
          <>
            <WorkSurfaceHeader title={emptyState.title} titleId="workspace-area-title" />
            {activeSlot}
          </>
        ) : (
          <div className={styles.emptyState}>
            <h1 id="workspace-area-title">{emptyState.title}</h1>
            <p>{emptyState.description}</p>
          </div>
        )}
      </section>
    </main>
  );
}
