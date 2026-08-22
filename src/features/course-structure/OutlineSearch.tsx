import { useMessages } from "@shared/i18n";
import { Icon } from "@shared/components/icon";
import styles from "@features/course-structure/CourseStructure.module.css";

export interface OutlineSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function OutlineSearch({ value, onChange }: OutlineSearchProps) {
  const messages = useMessages();
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
    </div>
  );
}
