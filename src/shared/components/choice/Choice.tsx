import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";
import { Icon } from "@shared/components/icon";
import styles from "@shared/components/choice/Choice.module.css";

export interface CheckChoiceProps {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly children: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

export function CheckChoice({
  checked,
  onCheckedChange,
  children,
  disabled,
  className,
}: CheckChoiceProps) {
  return (
    <label className={[styles.choice, className].filter(Boolean).join(" ")}>
      <Checkbox.Root
        className={styles.box}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <Checkbox.Indicator className={styles.mark}>
          <Icon name="check" size={14} />
        </Checkbox.Indicator>
      </Checkbox.Root>
      {children}
    </label>
  );
}

export interface RadioChoicesProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly "aria-label": string;
  readonly children: ReactNode;
}

export function RadioChoices({
  value,
  onValueChange,
  "aria-label": ariaLabel,
  children,
}: RadioChoicesProps) {
  return (
    <RadioGroup
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next) => {
        onValueChange(typeof next === "string" ? next : "");
      }}
    >
      {children}
    </RadioGroup>
  );
}

export interface RadioChoiceProps {
  readonly value: string;
  readonly children: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly className?: string | undefined;
}

export function RadioChoice({ value, children, disabled, className }: RadioChoiceProps) {
  return (
    <label className={[styles.choice, className].filter(Boolean).join(" ")}>
      <Radio.Root className={styles.dot} value={value} disabled={disabled}>
        <Radio.Indicator className={styles.dotMark} />
      </Radio.Root>
      {children}
    </label>
  );
}
