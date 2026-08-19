import { useState } from "react";
import type { ChoiceOption, MatchPairsExercise, RenderFragment } from "@core/course";
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

interface UiPair {
  readonly leftId: string;
  readonly rightId: string;
  readonly left: ChoiceOption;
  readonly right: ChoiceOption;
}

export interface MatchPairsEditorProps {
  readonly exercise: MatchPairsExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: MatchPairsExercise) => void;
}

export function MatchPairsEditor({ exercise, library, onChange }: MatchPairsEditorProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<MatchPairsExercise>(exercise);

  const update = (next: MatchPairsExercise) => {
    setEx(next);
    onChange(next);
  };

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const pairs: readonly UiPair[] = ex.evaluation.pairs.flatMap((pair) => {
    const left = ex.left.find((option) => option.id === pair.leftId);
    const right = ex.right.find((option) => option.id === pair.rightId);
    return left && right ? [{ leftId: pair.leftId, rightId: pair.rightId, left, right }] : [];
  });

  const setSideBody = (side: "left" | "right", id: string, fragment: RenderFragment) => {
    const options = ex[side].map((option) =>
      option.id === id ? { ...option, body: [fragment, ...option.body.slice(1)] } : option,
    );
    update({ ...ex, [side]: options });
  };

  const addPair = () => {
    const leftId = newFragmentId("left");
    const rightId = newFragmentId("right");
    update({
      ...ex,
      left: [...ex.left, { id: leftId, body: [textFragment("primary")] }],
      right: [...ex.right, { id: rightId, body: [textFragment("primary")] }],
      evaluation: { ...ex.evaluation, pairs: [...ex.evaluation.pairs, { leftId, rightId }] },
    });
  };

  const removePair = (leftId: string, rightId: string) => {
    update({
      ...ex,
      left: ex.left.filter((option) => option.id !== leftId),
      right: ex.right.filter((option) => option.id !== rightId),
      evaluation: {
        ...ex.evaluation,
        pairs: ex.evaluation.pairs.filter(
          (pair) => pair.leftId !== leftId || pair.rightId !== rightId,
        ),
      },
    });
  };

  const setFeedback = (key: "correct" | "incorrect", fragment: RenderFragment) => {
    update({ ...ex, feedback: { ...ex.feedback, [key]: [fragment] } });
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
        <PanelHeader title={te.pairsTitle} description={te.pairsDesc} />
        <div className={styles.optionList}>
          {pairs.map((pair, index) => (
            <div key={pair.leftId} className={styles.matchPair}>
              <div className={styles.matchPairHead}>
                <span className={styles.optionIndex}>{index + 1}</span>
                <IconButton
                  aria-label={format(te.removePair, { pair: index + 1 })}
                  size="sm"
                  onClick={() => {
                    removePair(pair.leftId, pair.rightId);
                  }}
                >
                  <Icon name="close" size={18} />
                </IconButton>
              </div>
              <FragmentField
                label={te.pairLeft}
                role="primary"
                fragment={pair.left.body[0]}
                library={library}
                onChange={(fragment) => {
                  setSideBody("left", pair.leftId, fragment);
                }}
              />
              <FragmentField
                label={te.pairRight}
                role="primary"
                fragment={pair.right.body[0]}
                library={library}
                onChange={(fragment) => {
                  setSideBody("right", pair.rightId, fragment);
                }}
              />
            </div>
          ))}
        </div>
        <div className={styles.tokenList}>
          <Button variant="ghost" onClick={addPair}>
            <Icon name="plus" size={18} />
            {t.addPair}
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
