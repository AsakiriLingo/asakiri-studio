import type { ProjectDirectoryGateway } from "@core/projects";
import type { ReactNode } from "react";
import { Button } from "@shared/components/button";
import { useProjectHub } from "@features/project-hub/hooks/use-project-hub";
import type { ProjectHubMessages } from "@features/project-hub/i18n/project-hub-messages";
import styles from "@features/project-hub/components/ProjectHubPage.module.css";

interface ProjectHubPageProps {
  readonly directoryGateway: ProjectDirectoryGateway;
  readonly headerActions?: ReactNode;
  readonly messages: ProjectHubMessages;
}

export function ProjectHubPage({ directoryGateway, headerActions, messages }: ProjectHubPageProps) {
  const { state, openProject } = useProjectHub(directoryGateway);
  const isOpening = state.status === "opening";

  return (
    <main className={styles.projectHub}>
      {headerActions && <header className={styles.headerActions}>{headerActions}</header>}

      <section className={styles.content} aria-labelledby="project-hub-title">
        <div className={styles.introductionBlock}>
          <h1 className={styles.title} id="project-hub-title">
            {messages.title}
          </h1>
          <p className={styles.introduction}>{messages.introduction}</p>
        </div>

        <div className={styles.projectEntry}>
          <div className={styles.projectCard}>
            <div className={styles.projectCardCopy}>
              <h2 className={styles.projectCardTitle}>{messages.openProjectTitle}</h2>
              <p className={styles.projectCardDescription}>{messages.openProjectDescription}</p>
            </div>
            <Button
              aria-busy={isOpening}
              data-loading={isOpening || undefined}
              focusableWhenDisabled={isOpening}
              onClick={() => void openProject(messages.dialogTitle)}
              disabled={!directoryGateway.isSupported || isOpening}
              size="lg"
            >
              {isOpening ? messages.openingFolder : messages.chooseFolder}
            </Button>
          </div>

          {!directoryGateway.isSupported && (
            <p className={styles.notice} role="status">
              {messages.unsupported}
            </p>
          )}

          {state.status === "error" && (
            <p
              className={[styles.notice, styles.noticeError].filter(Boolean).join(" ")}
              role="alert"
            >
              {messages.errors[state.code]}
            </p>
          )}

          {state.status === "opened" && (
            <div className={styles.openedProject} aria-live="polite">
              <span className={styles.openedProjectIcon} aria-hidden="true">
                ✓
              </span>
              <div className={styles.openedProjectDetails}>
                <strong>{state.project.name}</strong>
                <span>{state.project.locationLabel}</span>
              </div>
              <span className={styles.openedProjectStatus}>{messages.ready}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
