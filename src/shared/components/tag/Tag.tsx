import type { ReactNode } from "react";
import styles from "@shared/components/tag/Tag.module.css";

export type TagVariant = "default" | "accent" | "warning";

export interface TagProps {
  readonly children: ReactNode;
  readonly variant?: TagVariant;
}

function requiredStyle(name: string) {
  const className = styles[name];
  if (!className) throw new Error(`Missing Tag style: ${name}`);
  return className;
}

const variantClasses: Record<Exclude<TagVariant, "default">, string> = {
  accent: requiredStyle("accent"),
  warning: requiredStyle("warning"),
};

const rootClass = requiredStyle("root");

export function Tag({ children, variant = "default" }: TagProps) {
  const className = variant === "default" ? rootClass : `${rootClass} ${variantClasses[variant]}`;

  return <span className={className}>{children}</span>;
}
