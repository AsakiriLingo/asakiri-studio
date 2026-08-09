import type { ReactNode } from "react";
import styles from "@shared/components/panel/Panel.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface PanelHeaderProps {
  readonly title: string;
  readonly titleId?: string;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly spread?: boolean;
}

export function PanelHeader({
  title,
  titleId,
  description,
  actions,
  spread = false,
}: PanelHeaderProps) {
  return (
    <div className={joinClassNames(styles.header, spread ? styles.spread : undefined)}>
      <h2 className={styles.title} id={titleId}>
        {title}
      </h2>
      {description === undefined ? null : <span className={styles.description}>{description}</span>}
      {actions}
    </div>
  );
}
