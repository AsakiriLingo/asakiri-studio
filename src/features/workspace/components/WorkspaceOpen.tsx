import type { ReactNode } from "react";
import type { ContentCollectionSummary, ProjectReader } from "@core/project-reading";
import type { ProjectSession } from "@core/projects";
import { OutlineView } from "@features/workspace/components/OutlineView";
import { WorkspacePage } from "@features/workspace/components/WorkspacePage";
import { useCourse } from "@features/workspace/hooks/use-course";
import { useProjectValidation } from "@features/workspace/hooks/use-project-validation";
import type { WorkspaceMessages } from "@features/workspace/i18n/workspace-messages";
import { Button } from "@shared/components/button";
import styles from "@features/workspace/components/WorkspaceOpen.module.css";

interface WorkspaceOpenProps {
  readonly messages: WorkspaceMessages;
  readonly onBack: () => void;
  readonly session: ProjectSession;
  readonly reader?: ProjectReader;
  readonly renderContent?: (collections: readonly ContentCollectionSummary[]) => ReactNode;
  readonly workspaceActions?: ReactNode;
}

export function WorkspaceOpen({
  messages,
  onBack,
  reader,
  renderContent,
  session,
  workspaceActions,
}: WorkspaceOpenProps) {
  const openState = useProjectValidation(session, reader);
  const courseState = useCourse(session, reader);

  if (openState.status === "validating") {
    return (
      <main className={styles.status}>
        <p className={styles.validating} role="status">
          {messages.openStates.validating}
        </p>
      </main>
    );
  }

  if (openState.status === "invalid") {
    return (
      <main className={styles.status}>
        <div className={styles.invalid} role="alert">
          <h1 className={styles.invalidTitle}>{messages.openStates.invalidTitle}</h1>
          <p className={styles.invalidReason}>
            {messages.openStates.invalidReasons[openState.reason]}
          </p>
          <Button onClick={onBack} size="sm" variant="secondary">
            {messages.backToProjects}
          </Button>
        </div>
      </main>
    );
  }

  const lessonsSlot =
    courseState.status === "ready" ? (
      <OutlineView
        lessons={courseState.course.lessons}
        messages={messages.outline}
        outline={courseState.course.outline}
      />
    ) : undefined;

  return (
    <WorkspacePage
      contentSlot={renderContent?.(openState.collections)}
      lessonsSlot={lessonsSlot}
      messages={messages}
      onBack={onBack}
      projectName={session.name}
      workspaceActions={workspaceActions}
    />
  );
}
