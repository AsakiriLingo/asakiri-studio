import type { RenderFragment } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import { textFragment, type FragmentSource } from "@features/lesson-editor/exercise/fragment-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

export interface FragmentListProps {
  readonly fragments: readonly RenderFragment[];
  readonly library: RichEditorLibrary;
  readonly onChange: (fragments: readonly RenderFragment[]) => void;
  readonly label?: string;
  readonly ariaLabel?: string;
  readonly defaultSource?: FragmentSource | undefined;
}

export function FragmentList({
  fragments,
  library,
  onChange,
  label,
  ariaLabel,
  defaultSource,
}: FragmentListProps) {
  const te = useMessages().lesson.exercise;
  const format = useFormat();
  const items = fragments.length > 0 ? fragments : [textFragment("primary")];

  const setAt = (index: number, fragment: RenderFragment) => {
    onChange(items.map((entry, position) => (position === index ? fragment : entry)));
  };

  const addFragment = () => {
    onChange([...items, textFragment("supporting")]);
  };

  const removeAt = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, position) => position !== index));
  };

  return (
    <div className={styles.fragmentGroup}>
      {label === undefined ? null : <span className={styles.fragmentLabel}>{label}</span>}
      {items.map((fragment, index) => (
        <div key={fragment.id} className={styles.fragmentRow}>
          <FragmentField
            role={fragment.role}
            fragment={fragment}
            library={library}
            onChange={(next) => {
              setAt(index, next);
            }}
            {...(ariaLabel === undefined ? {} : { ariaLabel })}
            defaultSource={index === 0 ? defaultSource : undefined}
          />
          {items.length > 1 ? (
            <IconButton
              aria-label={format(te.removeDetail, { index: index + 1 })}
              size="sm"
              onClick={() => {
                removeAt(index);
              }}
            >
              <Icon name="close" size={18} />
            </IconButton>
          ) : null}
        </div>
      ))}
      <div className={styles.fragmentAdd}>
        <Button variant="ghost" onClick={addFragment}>
          <Icon name="plus" size={18} />
          {te.addDetail}
        </Button>
      </div>
    </div>
  );
}
