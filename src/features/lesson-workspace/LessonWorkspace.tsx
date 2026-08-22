import { useState, type ReactNode } from "react";
import {
  Group,
  Panel,
  Separator,
  usePanelRef,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
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

function toggle(panel: PanelImperativeHandle | null): void {
  if (!panel) return;
  if (panel.isCollapsed()) panel.expand();
  else panel.collapse();
}

export function LessonWorkspace({
  outline = [],
  outlineSlot,
  editorSlot,
  sourceSlot,
  previewSlot,
}: LessonWorkspaceProps) {
  const t = useMessages().lessonWorkspace;
  const outlineRef = usePanelRef();
  const contextRef = usePanelRef();
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [tab, setTab] = useState<ContextTab>("source");

  return (
    <Group orientation="horizontal" id="asakiri.lesson-workspace" className={styles.group}>
      <Panel
        id="outline"
        panelRef={outlineRef}
        collapsible
        collapsedSize={0}
        minSize="242px"
        maxSize="434px"
        defaultSize="18rem"
        className={styles.panel}
        onResize={(size) => {
          setOutlineCollapsed(size.asPercentage <= 0);
        }}
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
        <div className={styles.centerHeader}>
          <IconButton
            size="sm"
            aria-label={outlineCollapsed ? t.showOutline : t.hideOutline}
            aria-pressed={!outlineCollapsed}
            onClick={() => {
              toggle(outlineRef.current);
            }}
          >
            <Icon
              name="chevrons-left"
              size={18}
              className={outlineCollapsed ? styles.flip : undefined}
            />
          </IconButton>
          <span className={styles.centerTitle}>{t.editor}</span>
          <IconButton
            size="sm"
            aria-label={contextCollapsed ? t.showReference : t.hideReference}
            aria-pressed={!contextCollapsed}
            onClick={() => {
              toggle(contextRef.current);
            }}
          >
            <Icon
              name="chevrons-left"
              size={18}
              className={contextCollapsed ? undefined : styles.flip}
            />
          </IconButton>
        </div>
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
        panelRef={contextRef}
        collapsible
        collapsedSize={0}
        minSize="16rem"
        maxSize="32rem"
        defaultSize="22rem"
        className={styles.panel}
        onResize={(size) => {
          setContextCollapsed(size.asPercentage <= 0);
        }}
      >
        <div className={styles.tabs} role="tablist" aria-label={t.source}>
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
