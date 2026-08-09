import type { ReactNode } from "react";
import styles from "@shared/components/status/Status.module.css";

export type StatusTone = "default" | "warning" | "error";

export interface StatusProps {
  readonly children: ReactNode;
  readonly tone?: StatusTone;
}

function requiredStyle(name: string) {
  const className = styles[name];
  if (!className) throw new Error(`Missing Status style: ${name}`);
  return className;
}

const toneClasses: Record<Exclude<StatusTone, "default">, string> = {
  warning: requiredStyle("warning"),
  error: requiredStyle("error"),
};

const rootClass = requiredStyle("root");

export function Status({ children, tone = "default" }: StatusProps) {
  const className = tone === "default" ? rootClass : `${rootClass} ${toneClasses[tone]}`;

  return <span className={className}>{children}</span>;
}
