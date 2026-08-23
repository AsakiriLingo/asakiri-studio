import { useFormat, useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import styles from "@features/drafts/DraftsPanel.module.css";

export interface DraftsSearchProps {
  readonly value: string;
  readonly total: number;
  readonly active: number;
  readonly onChange: (value: string) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

export function DraftsSearch({
  value,
  total,
  active,
  onChange,
  onPrev,
  onNext,
}: DraftsSearchProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.drafts;
  const hasQuery = value.trim() !== "";

  return (
    <div className={styles.search}>
      <Icon name="search" size={16} className={styles.searchIcon} />
      <input
        type="search"
        className={styles.searchInput}
        value={value}
        placeholder={messages.common.searchPlaceholder}
        aria-label={messages.common.search}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      />
      {hasQuery ? (
        <>
          <span className={styles.searchCount}>
            {total === 0 ? t.noHits : format(t.hits, { current: active + 1, total })}
          </span>
          <IconButton size="sm" aria-label={t.previousHit} disabled={total === 0} onClick={onPrev}>
            <Icon name="chevron-left" size={18} />
          </IconButton>
          <IconButton size="sm" aria-label={t.nextHit} disabled={total === 0} onClick={onNext}>
            <Icon name="chevron-right" size={18} />
          </IconButton>
        </>
      ) : null}
    </div>
  );
}
