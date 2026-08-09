import { useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import type {
  ProjectCreationGateway,
  ProjectDirectory,
  ProjectDirectoryGateway,
} from "@core/projects";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { TextField } from "@shared/components/text-field";
import { useCreateCourse } from "@features/project-hub/hooks/use-create-course";
import { useProjectHub } from "@features/project-hub/hooks/use-project-hub";
import type { ProjectHubMessages } from "@features/project-hub/i18n/project-hub-messages";
import styles from "@features/project-hub/components/ProjectHubPage.module.css";

interface ProjectHubPageProps {
  readonly creationGateway: ProjectCreationGateway;
  readonly directoryGateway: ProjectDirectoryGateway;
  readonly headerActions?: ReactNode;
  readonly messages: ProjectHubMessages;
  readonly onProjectOpened: (project: ProjectDirectory) => void;
}

export function ProjectHubPage({
  creationGateway,
  directoryGateway,
  headerActions,
  messages,
  onProjectOpened,
}: ProjectHubPageProps) {
  const { state, openProject } = useProjectHub(directoryGateway);
  const { state: createState, createCourse, resetCreateCourse } = useCreateCourse(creationGateway);
  const [courseName, setCourseName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const isOpening = state.status === "opening";
  const isCreating = createState.status === "creating";

  async function handleOpenProject() {
    const project = await openProject(messages.dialogTitle);
    if (project) onProjectOpened(project);
  }

  async function submitNewCourse() {
    const project = await createCourse(courseName.trim(), messages.create.dialogTitle);
    if (project) {
      setIsCreateDialogOpen(false);
      setCourseName("");
      onProjectOpened(project);
    }
  }

  function changeCreateDialog(nextOpen: boolean) {
    if (!nextOpen && isCreating) return;
    setIsCreateDialogOpen(nextOpen);
    if (!nextOpen) {
      setCourseName("");
      resetCreateCourse();
    }
  }

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
          <h2 className={styles.startTitle}>{messages.startTitle}</h2>
          <div className={styles.commandList}>
            <Dialog.Root open={isCreateDialogOpen} onOpenChange={changeCreateDialog}>
              <Dialog.Trigger
                render={
                  <Button className={styles.command} size="sm" variant="ghost">
                    <Icon aria-hidden="true" name="plus" size={18} />
                    <span>{messages.create.openButton}</span>
                  </Button>
                }
              />

              <Dialog.Portal>
                <Dialog.Backdrop className={styles.dialogBackdrop} />
                <Dialog.Viewport className={styles.dialogViewport}>
                  <Dialog.Popup className={styles.dialogPopup}>
                    <div className={styles.dialogHeading}>
                      <Dialog.Title className={styles.dialogTitle}>
                        {messages.create.title}
                      </Dialog.Title>
                      <Dialog.Description className={styles.dialogDescription}>
                        {messages.create.description}
                      </Dialog.Description>
                    </div>

                    <form
                      className={styles.createForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitNewCourse();
                      }}
                    >
                      <TextField
                        autoComplete="off"
                        error={
                          createState.status === "error"
                            ? messages.create.errors[createState.code]
                            : undefined
                        }
                        label={messages.create.nameLabel}
                        name="new-course-name"
                        onValueChange={(value) => {
                          setCourseName(value);
                          if (createState.status === "error") resetCreateCourse();
                        }}
                        placeholder={messages.create.namePlaceholder}
                        required
                        type="text"
                        value={courseName}
                      />

                      <div className={styles.dialogActions}>
                        <Dialog.Close
                          disabled={isCreating}
                          render={
                            <Button size="md" variant="secondary">
                              {messages.create.cancelButton}
                            </Button>
                          }
                        />
                        <Button
                          aria-busy={isCreating}
                          data-loading={isCreating || undefined}
                          disabled={isCreating || courseName.trim().length === 0}
                          focusableWhenDisabled={isCreating}
                          size="md"
                          type="submit"
                        >
                          {isCreating ? messages.create.creating : messages.create.createButton}
                        </Button>
                      </div>
                    </form>
                  </Dialog.Popup>
                </Dialog.Viewport>
              </Dialog.Portal>
            </Dialog.Root>

            <Button
              aria-busy={isOpening}
              className={styles.command}
              data-loading={isOpening || undefined}
              disabled={isOpening}
              focusableWhenDisabled={isOpening}
              onClick={() => void handleOpenProject()}
              size="sm"
              variant="ghost"
            >
              <Icon aria-hidden="true" name="folder" size={18} />
              <span>{isOpening ? messages.openingFolder : messages.chooseFolder}</span>
            </Button>
          </div>

          <div className={styles.statusList}>
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
        </div>
      </section>
    </main>
  );
}
