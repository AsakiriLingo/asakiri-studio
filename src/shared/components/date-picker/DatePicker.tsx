import { Popover } from "@base-ui/react/popover";
import { useMemo, useRef, useState } from "react";
import { useLocale, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import styles from "@shared/components/date-picker/DatePicker.module.css";

export interface DatePickerProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly "aria-label"?: string | undefined;
  readonly id?: string | undefined;
}

const DAY = 24 * 60 * 60 * 1000;

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
}

function fromIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(locale: string): number {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    return first === undefined ? 0 : first % 7;
  } catch {
    return 0;
  }
}

function monthGrid(month: Date, weekStart: number): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(first.getTime() - offset * DAY);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getTime() + index * DAY));
}

export function DatePicker({ value, onValueChange, "aria-label": ariaLabel, id }: DatePickerProps) {
  const locale = useLocale();
  const t = useMessages().datePicker;
  const selected = fromIso(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selected ?? new Date());
  const [focused, setFocused] = useState(() => selected ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => startOfWeek(locale), [locale]);
  const days = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
  const today = toIso(new Date());

  const labels = useMemo(() => {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
    const full = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
    return {
      weekdays: Array.from({ length: 7 }, (_, index) =>
        weekday.format(new Date(2024, 0, 7 + ((weekStart + index) % 7))),
      ),
      monthYear: monthYear.format(month),
      full: (date: Date) => full.format(date),
      display: selected ? full.format(selected) : null,
    };
  }, [locale, month, weekStart, selected]);

  const moveFocus = (next: Date) => {
    setFocused(next);
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    window.requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
    });
  };

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = steps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveFocus(new Date(focused.getTime() + step * DAY));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const delta = event.key === "PageUp" ? -1 : 1;
      moveFocus(new Date(focused.getFullYear(), focused.getMonth() + delta, focused.getDate()));
    }
  };

  const choose = (date: Date) => {
    onValueChange(toIso(date));
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={styles.trigger} id={id} aria-label={ariaLabel}>
        <span className={labels.display === null ? styles.placeholder : undefined}>
          {labels.display ?? t.choose}
        </span>
        <Icon aria-hidden="true" name="calendar" size={18} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={styles.positioner} sideOffset={4} align="start">
          <Popover.Popup className={styles.popup}>
            <div className={styles.header}>
              <button
                type="button"
                className={styles.step}
                aria-label={t.previousMonth}
                onClick={() => {
                  shiftMonth(-1);
                }}
              >
                <Icon aria-hidden="true" name="arrow-left" size={16} />
              </button>
              <span aria-live="polite" className={styles.monthLabel}>
                {labels.monthYear}
              </span>
              <button
                type="button"
                className={styles.step}
                aria-label={t.nextMonth}
                onClick={() => {
                  shiftMonth(1);
                }}
              >
                <Icon aria-hidden="true" name="arrow" size={16} />
              </button>
            </div>

            <div className={styles.weekdays} aria-hidden="true">
              {labels.weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div
              ref={gridRef}
              className={styles.grid}
              role="grid"
              aria-label={labels.monthYear}
              onKeyDown={onGridKeyDown}
            >
              {days.map((date) => {
                const iso = toIso(date);
                const outside = date.getMonth() !== month.getMonth();
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    className={[
                      styles.day,
                      outside ? styles.outside : "",
                      iso === value ? styles.selected : "",
                      iso === today ? styles.today : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={labels.full(date)}
                    aria-selected={iso === value}
                    tabIndex={iso === toIso(focused) ? 0 : -1}
                    onClick={() => {
                      choose(date);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  choose(new Date());
                }}
              >
                {t.today}
              </button>
              <button
                type="button"
                className={styles.action}
                disabled={value === ""}
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                }}
              >
                {t.clear}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
