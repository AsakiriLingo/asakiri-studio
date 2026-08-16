import { Progress as BaseProgress } from "@base-ui/react/progress";
import styles from "@shared/components/progress/Progress.module.css";

export interface ProgressProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly detail?: string | undefined;
}

export function Progress({ value, max, label, detail }: ProgressProps) {
  return (
    <BaseProgress.Root className={styles.root} value={value} max={max}>
      <BaseProgress.Label className={styles.label}>{label}</BaseProgress.Label>
      <BaseProgress.Track className={styles.track}>
        <BaseProgress.Indicator className={styles.indicator} />
      </BaseProgress.Track>
      {detail === undefined ? null : <span className={styles.detail}>{detail}</span>}
    </BaseProgress.Root>
  );
}
