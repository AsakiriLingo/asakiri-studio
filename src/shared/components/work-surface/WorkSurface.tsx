import type { ReactNode } from "react";
import styles from "@shared/components/work-surface/WorkSurface.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface WorkInnerProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

export function WorkInner({ children, className }: WorkInnerProps) {
  return <div className={joinClassNames(styles.inner, className)}>{children}</div>;
}

export interface WorkHeaderProps {
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}

export function WorkHeader({ title, description, actions }: WorkHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        {title === undefined ? null : <h1 className={styles.title}>{title}</h1>}
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </div>
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
