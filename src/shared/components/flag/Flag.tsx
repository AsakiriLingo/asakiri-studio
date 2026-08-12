import { flagUrl } from "@shared/components/flag/flags";
import styles from "@shared/components/flag/Flag.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface FlagProps {
  readonly code: string;
  readonly size?: number;
  readonly className?: string | undefined;
  readonly alt?: string;
}

export function Flag({ code, size = 20, className, alt = "" }: FlagProps) {
  const url = flagUrl(code);
  if (!url) return null;
  return (
    <img
      src={url}
      width={size}
      height={size}
      className={joinClassNames(styles.flag, className)}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
