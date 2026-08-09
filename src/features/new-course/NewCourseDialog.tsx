import { useState } from "react";
import {
  ProjectCreationError,
  type ProjectCreationErrorCode,
  type ProjectDirectory,
} from "@core/projects";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { Field, TextInput } from "@shared/components/form";
import styles from "@features/new-course/NewCourseDialog.module.css";

export interface NewCourseDialogProps {
  readonly onCancel: () => void;
  readonly createCourse: (name: string) => Promise<ProjectDirectory | null>;
  readonly onCreated: (directory: ProjectDirectory) => void;
}

export function NewCourseDialog({ onCancel, createCourse, onCreated }: NewCourseDialogProps) {
  const messages = useMessages();
  const [name, setName] = useState("Japanese Starter");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorMessages: Record<ProjectCreationErrorCode, string> = {
    alreadyExists: messages.newCourse.errorAlreadyExists,
    invalidName: messages.newCourse.errorInvalidName,
    permissionDenied: messages.newCourse.errorPermissionDenied,
    unknown: messages.newCourse.errorUnknown,
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(errorMessages.invalidName);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const directory = await createCourse(trimmed);
      if (directory) {
        onCreated(directory);
      }
    } catch (cause) {
      setError(
        cause instanceof ProjectCreationError ? errorMessages[cause.code] : errorMessages.unknown,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <form
        className={styles.card}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>{messages.newCourse.title}</h1>
          <p className={styles.description}>{messages.newCourse.description}</p>
        </header>
        <div className={styles.body}>
          <Field label={messages.newCourse.nameLabel} help={messages.newCourse.nameHelp}>
            <TextInput
              name="course-name"
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
              }}
              autoComplete="off"
            />
          </Field>
          <Callout icon="folder">
            <strong>{messages.newCourse.calloutTitle}</strong>
            {messages.newCourse.calloutBody}
          </Callout>
          {error === null ? null : <p className={styles.error}>{error}</p>}
        </div>
        <footer className={styles.actions}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {messages.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? messages.newCourse.submitting : messages.newCourse.submit}
          </Button>
        </footer>
      </form>
    </main>
  );
}
