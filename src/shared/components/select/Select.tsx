import { Select as BaseSelect } from "@base-ui/react/select";
import { Icon } from "@shared/components/icon";
import styles from "@shared/components/select/Select.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps {
  readonly items: readonly SelectOption[];
  readonly name?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly value?: string | undefined;
  readonly onValueChange?: ((value: string) => void) | undefined;
  readonly placeholder?: string | undefined;
  readonly "aria-label"?: string | undefined;
  readonly className?: string | undefined;
  readonly elevated?: boolean | undefined;
}

export function Select({
  items,
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
  elevated,
}: SelectProps) {
  return (
    <BaseSelect.Root
      items={items}
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={
        onValueChange
          ? (next) => {
              onValueChange(next ?? "");
            }
          : undefined
      }
    >
      <BaseSelect.Trigger
        className={joinClassNames(styles.trigger, className)}
        aria-label={ariaLabel}
      >
        <BaseSelect.Value className={styles.value} placeholder={placeholder} />
        <BaseSelect.Icon className={styles.icon}>
          <Icon name="chevron-down" size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className={joinClassNames(styles.positioner, elevated ? styles.elevated : undefined)}
          sideOffset={4}
        >
          <BaseSelect.Popup className={styles.popup}>
            {items.map((item) => (
              <BaseSelect.Item key={item.value} className={styles.item} value={item.value}>
                <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className={styles.indicator}>
                  <Icon name="check" size={16} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
