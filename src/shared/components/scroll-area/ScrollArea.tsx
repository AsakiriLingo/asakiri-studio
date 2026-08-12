import type { ReactNode } from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import styles from "@shared/components/scroll-area/ScrollArea.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface ScrollAreaProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly viewportClassName?: string | undefined;
  readonly contentClassName?: string | undefined;
  readonly "aria-label"?: string | undefined;
}

export function ScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  "aria-label": ariaLabel,
}: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root className={joinClassNames(styles.root, className)}>
      <BaseScrollArea.Viewport
        className={joinClassNames(styles.viewport, viewportClassName)}
        aria-label={ariaLabel}
      >
        <BaseScrollArea.Content className={contentClassName}>{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar className={styles.scrollbar} orientation="vertical">
        <BaseScrollArea.Thumb className={styles.thumb} />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Scrollbar className={styles.scrollbar} orientation="horizontal">
        <BaseScrollArea.Thumb className={styles.thumb} />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Corner />
    </BaseScrollArea.Root>
  );
}
