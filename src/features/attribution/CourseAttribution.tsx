import { useMemo, useState } from "react";
import type { Course } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { Status } from "@shared/components/status";
import { PanelHeader } from "@shared/components/panel";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import {
  attributionsFrom,
  buildAttributionMarkdown,
} from "@features/attribution/attribution-markdown";
import styles from "@features/attribution/CourseAttribution.module.css";

export interface CourseAttributionProps {
  readonly course: Course;
  readonly onSaveAttribution: (markdown: string) => Promise<ProjectWriteResult>;
}

export function CourseAttribution({ course, onSaveAttribution }: CourseAttributionProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.attribution;
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const entries = useMemo(() => attributionsFrom(course.assets), [course.assets]);

  const save = () => {
    setSaveState("saving");
    const markdown = buildAttributionMarkdown(course.project.title, entries);
    void onSaveAttribution(markdown).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };

  const status =
    saveState === "saving" ? (
      <Status>{t.saving}</Status>
    ) : saveState === "saved" ? (
      <Status>{t.saved}</Status>
    ) : saveState === "failed" ? (
      <Status tone="error">{t.saveFailed}</Status>
    ) : null;

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Button
            size="compact"
            disabled={entries.length === 0 || saveState === "saving"}
            onClick={save}
          >
            <Icon name="check" size={18} />
            {t.save}
          </Button>
        }
      />

      <section aria-labelledby="attribution-title">
        <PanelHeader
          title={t.title}
          titleId="attribution-title"
          description={format(t.count, { count: entries.length })}
          actions={status}
        />

        {entries.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.colFile}</th>
                  <th>{t.colCredit}</th>
                  <th>{t.colLicense}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={`${entry.file}-${String(index)}`}>
                    <td className={styles.file}>{entry.file}</td>
                    <td>
                      <span className={styles.credit}>
                        {entry.author ? format(t.by, { author: entry.author }) : entry.provider}
                      </span>
                      {entry.author ? (
                        <span className={styles.provider}>{entry.provider}</span>
                      ) : null}
                    </td>
                    <td className={styles.license}>{entry.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkInner>
  );
}
