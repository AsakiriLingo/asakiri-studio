import { useState, type ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import styles from "@features/lesson-workspace/LessonWorkspace.module.css";

export interface LessonWorkspaceLesson {
  readonly id: string;
  readonly title: string;
}

export interface LessonWorkspaceUnit {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly LessonWorkspaceLesson[];
}

export interface LessonWorkspaceProps {
  readonly outline?: readonly LessonWorkspaceUnit[];
  readonly outlineSlot?: ReactNode;
  readonly editorSlot?: ReactNode;
  readonly sourceSlot?: ReactNode;
  readonly previewSlot?: ReactNode;
}

type ContextTab = "source" | "preview";

export function LessonWorkspace({
  outline = [],
  outlineSlot,
  editorSlot,
  sourceSlot,
  previewSlot,
}: LessonWorkspaceProps) {
  const t = useMessages().lessonWorkspace;
  const [tab, setTab] = useState<ContextTab>("preview");

  return (
    <Group orientation="horizontal" id="asakiri.lesson-workspace" className={styles.group}>
      <Panel
        id="outline"
        collapsible
        collapsedSize={0}
        minSize="242px"
        maxSize="434px"
        defaultSize="18rem"
        className={[styles.panel, styles.outlinePanel].join(" ")}
      >
        <div className={styles.panelBody}>
          {outlineSlot ??
            (outline.length === 0 ? (
              <p className={styles.empty}>{t.outlineEmpty}</p>
            ) : (
              <ul className={styles.tree}>
                {outline.map((unit) => (
                  <li key={unit.id} className={styles.unit}>
                    <span className={styles.unitTitle}>{unit.title}</span>
                    {unit.lessons.length > 0 && (
                      <ul className={styles.lessons}>
                        {unit.lessons.map((lesson) => (
                          <li key={lesson.id} className={styles.lesson}>
                            {lesson.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </Panel>

      <Separator className={styles.handle} />

      <Panel id="editor" minSize="24rem" className={styles.panel}>
        {editorSlot ? (
          <div className={styles.editorHost}>{editorSlot}</div>
        ) : (
          <div className={styles.centerBody}>
            <p className={styles.empty}>{t.selectPart}</p>
          </div>
        )}
      </Panel>

      <Separator className={styles.handle} />

      <Panel
        id="context"
        collapsible
        collapsedSize={0}
        minSize="16rem"
        maxSize="32rem"
        defaultSize="22rem"
        className={styles.panel}
      >
        <div className={styles.tabs} role="tablist" aria-label={t.preview}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            className={styles.tab}
            onClick={() => {
              setTab("preview");
            }}
          >
            <Icon name="eye" size={16} />
            {t.preview}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "source"}
            className={styles.tab}
            onClick={() => {
              setTab("source");
            }}
          >
            <Icon name="file-text" size={16} />
            {t.source}
          </button>
        </div>
        <div className={styles.panelBody}>
          {tab === "source"
            ? (sourceSlot ?? <p className={styles.empty}>{t.sourceEmpty}</p>)
            : (previewSlot ?? <p className={styles.empty}>{t.previewEmpty}</p>)}
        </div>
      </Panel>
    </Group>
  );
}
