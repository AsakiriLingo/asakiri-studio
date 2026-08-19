import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChoiceOption, RenderFragment, WordOrderExercise } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { ExerciseShell } from "@features/lesson-editor/exercise/ExerciseShell";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import { newFragmentId, textFragment } from "@features/lesson-editor/exercise/fragment-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function SortableTokenRow({
  token,
  index,
  library,
  onChange,
  onRemove,
}: {
  readonly token: ChoiceOption;
  readonly index: number;
  readonly library: RichEditorLibrary;
  readonly onChange: (fragment: RenderFragment) => void;
  readonly onRemove: () => void;
}) {
  const messages = useMessages();
  const format = useFormat();
  const te = messages.lesson.exercise;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: token.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={joinClassNames(styles.tokenRow, isDragging ? styles.dragging : undefined)}
    >
      <button
        type="button"
        className={styles.reorderHandle}
        aria-label={format(messages.common.reorder, { label: index + 1 })}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={18} />
      </button>
      <span className={joinClassNames(styles.optionIndex, styles.mono)}>{index + 1}</span>
      <FragmentField
        role="primary"
        fragment={token.body[0]}
        library={library}
        onChange={onChange}
        ariaLabel={te.tokenContent}
      />
      <IconButton
        aria-label={format(te.removeToken, { token: index + 1 })}
        size="sm"
        onClick={onRemove}
      >
        <Icon name="close" size={18} />
      </IconButton>
    </div>
  );
}

export interface WordOrderEditorProps {
  readonly exercise: WordOrderExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: WordOrderExercise) => void;
}

export function WordOrderEditor({ exercise, library, onChange }: WordOrderEditorProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<WordOrderExercise>(exercise);

  const update = (next: WordOrderExercise) => {
    setEx(next);
    onChange(next);
  };

  const commitTokens = (tokens: readonly ChoiceOption[]) => {
    update({
      ...ex,
      tokens,
      evaluation: { ...ex.evaluation, correctOrder: tokens.map((token) => token.id) },
    });
  };

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const setTokenBody = (id: string, fragment: RenderFragment) => {
    commitTokens(
      ex.tokens.map((token) =>
        token.id === id ? { ...token, body: [fragment, ...token.body.slice(1)] } : token,
      ),
    );
  };

  const addToken = () => {
    commitTokens([...ex.tokens, { id: newFragmentId("token"), body: [textFragment("primary")] }]);
  };

  const removeToken = (id: string) => {
    commitTokens(ex.tokens.filter((token) => token.id !== id));
  };

  const distractors = ex.distractors ?? [];
  const commitDistractors = (next: readonly ChoiceOption[]) => {
    update({ ...ex, distractors: next });
  };

  const setDistractorBody = (id: string, fragment: RenderFragment) => {
    commitDistractors(
      distractors.map((token) =>
        token.id === id ? { ...token, body: [fragment, ...token.body.slice(1)] } : token,
      ),
    );
  };

  const addDistractor = () => {
    commitDistractors([
      ...distractors,
      { id: newFragmentId("distractor"), body: [textFragment("primary")] },
    ]);
  };

  const removeDistractor = (id: string) => {
    commitDistractors(distractors.filter((token) => token.id !== id));
  };

  const setFeedback = (key: "correct" | "incorrect", fragment: RenderFragment) => {
    update({ ...ex, feedback: { ...ex.feedback, [key]: [fragment] } });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = ex.tokens.map((token) => token.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    commitTokens(arrayMove([...ex.tokens], from, to));
  };

  const optionsSection = (
    <div className={styles.formGrid}>
      <FragmentField
        label={t.prompt}
        role="primary"
        fragment={ex.prompt[0]}
        library={library}
        onChange={setPrompt}
      />

      <div>
        <PanelHeader title={te.answerOrderTitle} description={te.answerOrderDesc} />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={ex.tokens.map((token) => token.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.optionList}>
              {ex.tokens.map((token, index) => (
                <SortableTokenRow
                  key={token.id}
                  token={token}
                  index={index}
                  library={library}
                  onChange={(fragment) => {
                    setTokenBody(token.id, fragment);
                  }}
                  onRemove={() => {
                    removeToken(token.id);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className={styles.tokenList}>
          <Button variant="ghost" onClick={addToken}>
            <Icon name="plus" size={18} />
            {te.addWord}
          </Button>
        </div>
      </div>

      <div>
        <PanelHeader title={te.distractorTilesTitle} description={te.distractorTilesDesc} />
        <div className={styles.optionList}>
          {distractors.map((token, index) => (
            <div key={token.id} className={styles.exerciseRow}>
              <FragmentField
                role="primary"
                fragment={token.body[0]}
                library={library}
                onChange={(fragment) => {
                  setDistractorBody(token.id, fragment);
                }}
                ariaLabel={te.distractorContent}
              />
              <IconButton
                aria-label={format(te.removeDistractor, { token: index + 1 })}
                size="sm"
                onClick={() => {
                  removeDistractor(token.id);
                }}
              >
                <Icon name="close" size={18} />
              </IconButton>
            </div>
          ))}
        </div>
        <div className={styles.tokenList}>
          <Button variant="ghost" onClick={addDistractor}>
            <Icon name="plus" size={18} />
            {te.addDistractor}
          </Button>
        </div>
      </div>
    </div>
  );

  const feedbackSection = (
    <div className={styles.formGrid}>
      <PanelHeader title={te.feedbackTitle} description={te.feedbackDesc} />
      <FragmentField
        label={te.feedbackCorrect}
        role="primary"
        fragment={ex.feedback?.correct?.[0]}
        library={library}
        onChange={(fragment) => {
          setFeedback("correct", fragment);
        }}
      />
      <FragmentField
        label={te.feedbackIncorrect}
        role="primary"
        fragment={ex.feedback?.incorrect?.[0]}
        library={library}
        onChange={(fragment) => {
          setFeedback("incorrect", fragment);
        }}
      />
    </div>
  );

  return <ExerciseShell options={optionsSection} feedback={feedbackSection} />;
}
