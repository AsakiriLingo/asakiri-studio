import { forwardRef, type ComponentProps } from "react";
import { Field } from "@base-ui/react/field";
import styles from "@shared/components/text-field/TextField.module.css";

type FieldControlProps = ComponentProps<typeof Field.Control>;

export interface TextFieldProps extends Omit<
  FieldControlProps,
  "className" | "name" | "onValueChange"
> {
  readonly description?: string | undefined;
  readonly error?: string | undefined;
  readonly label: string;
  readonly name: string;
  readonly onValueChange?: FieldControlProps["onValueChange"];
}

export const TextField = forwardRef<HTMLElement, TextFieldProps>(function TextField(
  { description, error, label, name, onValueChange, ...controlProps },
  ref,
) {
  return (
    <Field.Root className={styles.root} invalid={Boolean(error)} name={name}>
      <Field.Label className={styles.label}>{label}</Field.Label>
      <Field.Control
        ref={ref}
        className={styles.control}
        onValueChange={onValueChange}
        {...controlProps}
      />
      <div className={styles.message}>
        {error ? (
          <Field.Error className={styles.error} match role="alert">
            {error}
          </Field.Error>
        ) : description ? (
          <Field.Description className={styles.description}>{description}</Field.Description>
        ) : null}
      </div>
    </Field.Root>
  );
});
