import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Icon } from "@shared/components/icon";
import { ScrollArea } from "@shared/components/scroll-area";
import { useMessages } from "@shared/i18n";
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
  readonly searchable?: boolean | undefined;
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
  searchable,
}: SelectProps) {
  const messages = useMessages();

  if (searchable) {
    const selected =
      value === undefined ? undefined : (items.find((item) => item.value === value) ?? null);
    const initial =
      defaultValue === undefined
        ? undefined
        : (items.find((item) => item.value === defaultValue) ?? null);

    return (
      <BaseCombobox.Root
        name={name}
        items={items}
        value={selected}
        defaultValue={initial}
        limit={100}
        autoHighlight
        isItemEqualToValue={(item, selectedItem) => item.value === selectedItem.value}
        onValueChange={(item) => {
          if (item) onValueChange?.(item.value);
        }}
      >
        <BaseCombobox.InputGroup className={joinClassNames(styles.searchGroup, className)}>
          <Icon name="search" size={16} className={styles.searchIcon} />
          <BaseCombobox.Input
            className={styles.searchInput}
            aria-label={ariaLabel}
            placeholder={placeholder ?? messages.common.searchPlaceholder}
            type="search"
            autoComplete="off"
            spellCheck={false}
          />
          <BaseCombobox.Trigger className={styles.searchTrigger} aria-label={ariaLabel}>
            <Icon name="chevron-down" size={16} />
          </BaseCombobox.Trigger>
        </BaseCombobox.InputGroup>
        <BaseCombobox.Portal>
          <BaseCombobox.Positioner
            className={joinClassNames(styles.positioner, elevated ? styles.elevated : undefined)}
            sideOffset={4}
            align="start"
          >
            <BaseCombobox.Popup className={styles.popup}>
              <BaseCombobox.Empty className={styles.empty}>
                {messages.common.noResults}
              </BaseCombobox.Empty>
              <ScrollArea
                className={styles.scroll}
                viewportClassName={styles.scrollViewport}
                contentStyle={{ minWidth: 0 }}
              >
                <BaseCombobox.List className={styles.list}>
                  {(item: SelectOption, index: number) => (
                    <BaseCombobox.Item
                      key={item.value}
                      className={styles.item}
                      value={item}
                      index={index}
                    >
                      <span className={styles.value}>{item.label}</span>
                      <BaseCombobox.ItemIndicator className={styles.indicator}>
                        <Icon name="check" size={16} />
                      </BaseCombobox.ItemIndicator>
                    </BaseCombobox.Item>
                  )}
                </BaseCombobox.List>
              </ScrollArea>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    );
  }

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
            <ScrollArea
              className={styles.scroll}
              viewportClassName={styles.scrollViewport}
              contentStyle={{ minWidth: 0 }}
            >
              {items.map((item) => (
                <BaseSelect.Item key={item.value} className={styles.item} value={item.value}>
                  <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className={styles.indicator}>
                    <Icon name="check" size={16} />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </ScrollArea>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
