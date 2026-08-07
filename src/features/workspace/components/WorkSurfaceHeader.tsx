import type { ReactNode } from "react";
import styles from "@features/workspace/components/WorkSurfaceHeader.module.css";

interface WorkSurfaceHeaderProps {
  readonly title: string;
  readonly titleId?: string;
  readonly actions?: ReactNode;
}

export function WorkSurfaceHeader({ title, titleId, actions }: WorkSurfaceHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title} id={titleId}>
        {title}
      </h1>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
