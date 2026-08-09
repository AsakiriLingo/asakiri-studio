import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
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
