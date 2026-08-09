import type { ReactNode } from "react";
import { Icon, type IconName } from "@shared/components/icon";
import styles from "@shared/components/callout/Callout.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface CalloutProps {
  readonly icon: IconName;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

export function Callout({ icon, children, className }: CalloutProps) {
  return (
    <div className={joinClassNames(styles.root, className)}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
}
