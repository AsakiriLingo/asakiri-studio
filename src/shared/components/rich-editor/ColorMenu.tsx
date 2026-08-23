import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Icon, type IconName } from "@shared/components/icon";
import { Tooltip } from "@shared/components/tooltip";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

export interface Swatch {
  readonly value: string;
  readonly label: string;
}

export interface ColorMenuProps {
  readonly icon: IconName;
  readonly menuLabel: string;
  readonly clearLabel: string;
  readonly swatches: readonly Swatch[];
  readonly onSelect: (value: string) => void;
  readonly onClear: () => void;
}

export function ColorMenu({
  icon,
  menuLabel,
  clearLabel,
  swatches,
  onSelect,
  onClear,
}: ColorMenuProps) {
  const [open, setOpen] = useState(false);

  const pick = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={menuLabel}>
        <Popover.Trigger className={styles.toolButton} aria-label={menuLabel}>
          <Icon name={icon} size={18} />
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className={styles.swatchPopup} aria-label={menuLabel}>
            <div className={styles.swatchGrid}>
              {swatches.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className={styles.swatch}
                  style={{ background: swatch.value }}
                  aria-label={swatch.label}
                  onClick={() => {
                    pick(swatch.value);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.swatchClear}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              {clearLabel}
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
