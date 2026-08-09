import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { Field, TextInput } from "@shared/components/form";
import styles from "@features/new-course/NewCourseDialog.module.css";

export interface NewCourseDialogProps {
  readonly onCancel: () => void;
  readonly onChooseFolder: () => void;
}

export function NewCourseDialog({ onCancel, onChooseFolder }: NewCourseDialogProps) {
  return (
    <main className={styles.page}>
      <form
        className={styles.card}
        onSubmit={(event) => {
          event.preventDefault();
          onChooseFolder();
        }}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>Create a course</h1>
          <p className={styles.description}>
            Name the project, then choose where its folder should be created.
          </p>
        </header>
        <div className={styles.body}>
          <Field
            label="Course name"
            help="The folder uses this exact name, including capitalization."
          >
            <TextInput name="course-name" defaultValue="Japanese Starter" autoComplete="off" />
          </Field>
          <Callout icon="folder">
            <strong>Created locally</strong>
            <br />
            Studio creates the folder, adds the course files, and initializes Git. You can use your
            preferred Git tools later.
          </Callout>
        </div>
        <footer className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Choose folder</Button>
        </footer>
      </form>
    </main>
  );
}
