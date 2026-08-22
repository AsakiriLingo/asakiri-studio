import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Group, Panel, Separator, type PanelImperativeHandle } from "react-resizable-panels";
import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { ScrollArea } from "@shared/components/scroll-area";
import styles from "@features/lesson-workspace/LessonWorkspace.module.css";

const ANIMATION_MS = 180;

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
  readonly outlineFooter?: ReactNode;
  readonly editorSlot?: ReactNode;
  readonly draftsSlot?: ReactNode;
  readonly draftsActions?: ReactNode;
  readonly draftsFooter?: ReactNode;
  readonly previewSlot?: ReactNode;
  readonly outlineCollapsed?: boolean;
  readonly onOutlineCollapsedChange?: (collapsed: boolean) => void;
  readonly referenceCollapsed?: boolean;
  readonly onReferenceCollapsedChange?: (collapsed: boolean) => void;
}

type ContextTab = "drafts" | "preview";

export function LessonWorkspace({
  outline = [],
  outlineSlot,
  outlineFooter,
  editorSlot,
  draftsSlot,
  draftsActions,
  draftsFooter,
  previewSlot,
  outlineCollapsed = false,
  onOutlineCollapsedChange,
  referenceCollapsed = false,
  onReferenceCollapsedChange,
}: LessonWorkspaceProps) {
  const t = useMessages().lessonWorkspace;
  const [tab, setTab] = useState<ContextTab>("preview");
  const outlineRef = useRef<PanelImperativeHandle | null>(null);
  const contextRef = useRef<PanelImperativeHandle | null>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(
    () => () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    },
    [],
  );

  useLayoutEffect(() => {
    const panel = outlineRef.current;
    if (!panel) return;
    if (outlineCollapsed && !panel.isCollapsed()) panel.collapse();
    else if (!outlineCollapsed && panel.isCollapsed()) panel.expand();
  }, [outlineCollapsed]);

  useLayoutEffect(() => {
    const panel = contextRef.current;
    if (!panel) return;
    if (referenceCollapsed && !panel.isCollapsed()) panel.collapse();
    else if (!referenceCollapsed && panel.isCollapsed()) panel.expand();
  }, [referenceCollapsed]);

  const animate = (action: () => void) => {
    setAnimating(true);
    action();
    if (animationTimer.current) clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => {
      setAnimating(false);
    }, ANIMATION_MS);
  };

  return (
    <div className={styles.workspace}>
      <Group
        orientation="horizontal"
        id="asakiri.lesson-workspace"
        className={[styles.group, animating ? styles.animating : ""].filter(Boolean).join(" ")}
      >
        <Panel
          id="outline"
          collapsible
          collapsedSize={0}
          minSize="242px"
          maxSize="434px"
          defaultSize="18rem"
          panelRef={outlineRef}
          onResize={(size) => {
            onOutlineCollapsedChange?.(size.inPixels === 0);
          }}
          className={[styles.panel, styles.outlinePanel].join(" ")}
        >
          <ScrollArea className={styles.scrollHost} contentClassName={styles.outlineScroll}>
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
          </ScrollArea>
          <div className={[styles.panelFooter, styles.footerEnd].join(" ")}>
            {outlineFooter ? <div className={styles.footerSlot}>{outlineFooter}</div> : null}
            <IconButton
              size="sm"
              aria-label={t.hideOutline}
              onClick={() => {
                animate(() => outlineRef.current?.collapse());
              }}
            >
              <Icon name="sidebar" size={18} />
            </IconButton>
          </div>
        </Panel>

        <Separator className={styles.handle} />

        <Panel id="editor" minSize="24rem" className={styles.panel}>
          {editorSlot ? (
            <ScrollArea className={styles.scrollHost} contentStyle={{ minWidth: 0 }}>
              {editorSlot}
            </ScrollArea>
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
          maxSize="50%"
          defaultSize="22rem"
          panelRef={contextRef}
          onResize={(size) => {
            onReferenceCollapsedChange?.(size.inPixels === 0);
          }}
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
              aria-selected={tab === "drafts"}
              className={styles.tab}
              onClick={() => {
                setTab("drafts");
              }}
            >
              <Icon name="file-text" size={16} />
              {t.drafts}
            </button>
            {tab === "drafts" && draftsActions ? (
              <span className={styles.tabActions}>{draftsActions}</span>
            ) : null}
          </div>
          <ScrollArea
            className={styles.scrollHost}
            contentClassName={styles.refScroll}
            contentStyle={{ minWidth: 0 }}
          >
            {tab === "drafts"
              ? (draftsSlot ?? <p className={styles.empty}>{t.draftsEmpty}</p>)
              : (previewSlot ?? <p className={styles.empty}>{t.previewEmpty}</p>)}
          </ScrollArea>
          <div className={styles.panelFooter}>
            <IconButton
              size="sm"
              aria-label={t.hideReference}
              onClick={() => {
                animate(() => contextRef.current?.collapse());
              }}
            >
              <Icon name="sidebar-right" size={18} />
            </IconButton>
            {tab === "drafts" && draftsFooter ? (
              <div className={styles.footerSlot}>{draftsFooter}</div>
            ) : null}
          </div>
        </Panel>
      </Group>

      {outlineCollapsed ? (
        <div className={[styles.pill, styles.pillLeft].join(" ")}>
          <IconButton
            size="sm"
            aria-label={t.showOutline}
            onClick={() => {
              animate(() => outlineRef.current?.expand());
            }}
          >
            <Icon name="sidebar" size={18} />
          </IconButton>
        </div>
      ) : null}

      {referenceCollapsed ? (
        <div className={[styles.pill, styles.pillRight].join(" ")}>
          <IconButton
            size="sm"
            aria-label={t.showReference}
            onClick={() => {
              animate(() => contextRef.current?.expand());
            }}
          >
            <Icon name="sidebar-right" size={18} />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
