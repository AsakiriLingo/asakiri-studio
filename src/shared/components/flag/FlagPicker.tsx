import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useLocale, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { TextInput } from "@shared/components/form";
import { ScrollArea } from "@shared/components/scroll-area";
import { Flag } from "@shared/components/flag/Flag";
import { FLAG_CODES } from "@shared/components/flag/flags";
import styles from "@shared/components/flag/FlagPicker.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

interface FlagOption {
  readonly code: string;
  readonly name: string;
}

function buildOptions(locale: string): FlagOption[] {
  const display = new Intl.DisplayNames([locale], { type: "region" });
  return FLAG_CODES.map((code) => {
    let name = code;
    if (/^[a-z]{2}$/.test(code)) {
      try {
        name = display.of(code.toUpperCase()) ?? code;
      } catch {
        name = code;
      }
    }
    return { code, name };
  });
}

export interface FlagPickerProps {
  readonly value: string;
  readonly onChange: (code: string) => void;
}

export function FlagPicker({ value, onChange }: FlagPickerProps) {
  const t = useMessages().flag;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => buildOptions(locale), [locale]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) => option.name.toLowerCase().includes(q) || option.code.includes(q),
    );
  }, [options, query]);

  const currentName = value ? (options.find((option) => option.code === value)?.name ?? value) : "";

  const select = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger} aria-label={value ? t.change : t.add}>
        {value ? <Flag code={value} size={20} /> : <Icon name="language" size={18} />}
        <span className={styles.triggerLabel}>{value ? currentName : t.add}</span>
        <Icon name="chevron-down" size={16} className={styles.triggerIcon} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={styles.positioner} sideOffset={4} align="start">
          <Popover.Popup className={styles.popup}>
            <div className={styles.search}>
              <Icon name="search" size={16} className={styles.searchIcon} />
              <TextInput
                type="search"
                autoFocus
                className={styles.searchInput}
                value={query}
                placeholder={t.searchPlaceholder}
                aria-label={t.search}
                autoComplete="off"
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                }}
              />
            </div>
            {value ? (
              <button
                type="button"
                className={styles.removeRow}
                onClick={() => {
                  select("");
                }}
              >
                <Icon name="language" size={18} />
                {t.remove}
              </button>
            ) : null}
            <ScrollArea className={styles.listScroll} viewportClassName={styles.listViewport}>
              <div className={styles.list}>
                {filtered.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    title={option.name}
                    className={joinClassNames(
                      styles.option,
                      option.code === value ? styles.optionSelected : undefined,
                    )}
                    onClick={() => {
                      select(option.code);
                    }}
                  >
                    <Flag code={option.code} size={22} />
                    <span className={styles.optionName}>{option.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
