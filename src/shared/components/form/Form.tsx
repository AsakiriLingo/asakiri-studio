import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
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

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function TextInput(props: TextInputProps) {
  return <input className={styles.input} {...props} />;
}

export type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function TextArea(props: TextAreaProps) {
  return <textarea className={styles.textarea} {...props} />;
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

export function Select(props: SelectProps) {
  return <select className={styles.select} {...props} />;
}
