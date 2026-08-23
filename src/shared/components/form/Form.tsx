import type {
  FocusEventHandler,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { NumberField } from "@base-ui/react/number-field";
import { Icon } from "@shared/components/icon";
import { useMessages } from "@shared/i18n";
import styles from "@shared/components/form/Form.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface FieldProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly help?: string;
  readonly className?: string | undefined;
}

export function Field({ label, children, help, className }: FieldProps) {
  return (
    <label className={joinClassNames(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      {children}
      {help === undefined ? null : <span className={styles.help}>{help}</span>}
    </label>
  );
}

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  readonly className?: string | undefined;
}

export function TextInput({ className, type = "text", ...props }: TextInputProps) {
  return <input type={type} className={joinClassNames(styles.input, className)} {...props} />;
}

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> {
  readonly className?: string | undefined;
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  return <input type="password" className={joinClassNames(styles.input, className)} {...props} />;
}

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> {
  readonly className?: string | undefined;
}

export function TextArea({ className, ...props }: TextAreaProps) {
  return <textarea className={joinClassNames(styles.textarea, className)} {...props} />;
}

export interface NumberInputProps {
  readonly name?: string;
  readonly id?: string;
  readonly value?: number | null;
  readonly defaultValue?: number | null;
  readonly onValueChange?: (value: number | null) => void;
  readonly onBlur?: FocusEventHandler<HTMLInputElement>;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string | undefined;
}

export function NumberInput({
  className,
  onValueChange,
  onBlur,
  placeholder,
  value,
  defaultValue,
  ...root
}: NumberInputProps) {
  const messages = useMessages();
  return (
    <NumberField.Root
      className={joinClassNames(styles.number, className)}
      value={value}
      defaultValue={defaultValue ?? undefined}
      onValueChange={(next) => onValueChange?.(next)}
      {...root}
    >
      <NumberField.Group className={styles.numberGroup}>
        <NumberField.Input
          className={styles.numberInput}
          placeholder={placeholder}
          autoComplete="off"
          onBlur={onBlur}
        />
        <div className={styles.numberSteppers}>
          <NumberField.Increment
            className={styles.numberStepper}
            aria-label={messages.common.increment}
          >
            <Icon
              name="chevron-down"
              size={14}
              className={styles.numberStepperUp}
              aria-hidden="true"
            />
          </NumberField.Increment>
          <NumberField.Decrement
            className={styles.numberStepper}
            aria-label={messages.common.decrement}
          >
            <Icon name="chevron-down" size={14} aria-hidden="true" />
          </NumberField.Decrement>
        </div>
      </NumberField.Group>
    </NumberField.Root>
  );
}
