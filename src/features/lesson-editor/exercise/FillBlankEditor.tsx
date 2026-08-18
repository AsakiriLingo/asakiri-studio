import { useState } from "react";
import type { ChoiceOption, FillBlankExercise, RenderFragment } from "@core/course";
import type { RichEditorLibrary } from "@shared/components/rich-editor";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Field, TextArea } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Select } from "@shared/components/select";
import { ExerciseShell } from "@features/lesson-editor/exercise/ExerciseShell";
import { FragmentField } from "@features/lesson-editor/exercise/FragmentField";
import {
  fragmentLabel,
  newFragmentId,
  textFragment,
} from "@features/lesson-editor/exercise/fragment-model";
import { parseSentence, sentenceFromStem } from "@features/lesson-editor/exercise/fill-blank-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

export interface FillBlankEditorProps {
  readonly exercise: FillBlankExercise;
  readonly library: RichEditorLibrary;
  readonly onChange: (exercise: FillBlankExercise) => void;
}

export function FillBlankEditor({ exercise, library, onChange }: FillBlankEditorProps) {
  const messages = useMessages();
  const format = useFormat();
  const t = messages.lesson;
  const te = t.exercise;
  const [ex, setEx] = useState<FillBlankExercise>(exercise);
  const [sentence, setSentence] = useState(() => sentenceFromStem(exercise.stem));

  const update = (next: FillBlankExercise) => {
    setEx(next);
    onChange(next);
  };

  const setPrompt = (fragment: RenderFragment) => {
    update({ ...ex, prompt: [fragment, ...ex.prompt.slice(1)] });
  };

  const bank = ex.bank ?? [];

  const commitSentence = (nextSentence: string) => {
    const previous = ex.stem
      .filter((segment) => segment.kind === "blank")
      .map((segment) => segment.id);
    const { stem, blankIds } = parseSentence(nextSentence, previous);
    const existing = new Map(ex.evaluation.blanks.map((blank) => [blank.blankId, blank]));
    const blanks = blankIds.map((id) => existing.get(id) ?? { blankId: id });
    update({ ...ex, stem, evaluation: { ...ex.evaluation, blanks } });
  };

  const onSentenceChange = (value: string) => {
    setSentence(value);
    commitSentence(value);
  };

  const commitBank = (next: readonly ChoiceOption[]) => {
    update({ ...ex, bank: next });
  };

  const setTileBody = (id: string, fragment: RenderFragment) => {
    commitBank(
      bank.map((tile) =>
        tile.id === id ? { ...tile, body: [fragment, ...tile.body.slice(1)] } : tile,
      ),
    );
  };

  const addTile = () => {
    commitBank([...bank, { id: newFragmentId("tile"), body: [textFragment("primary")] }]);
  };

  const removeTile = (id: string) => {
    const blanks = ex.evaluation.blanks.map((blank) => ({
      ...blank,
      ...(blank.correctOptionIds
        ? { correctOptionIds: blank.correctOptionIds.filter((entry) => entry !== id) }
        : {}),
    }));
    update({
      ...ex,
      bank: bank.filter((tile) => tile.id !== id),
      evaluation: { ...ex.evaluation, blanks },
    });
  };

  const setBlankCorrect = (blankId: string, tileId: string) => {
    const blanks = ex.evaluation.blanks.map((blank) =>
      blank.blankId === blankId
        ? { ...blank, correctOptionIds: tileId === "" ? [] : [tileId] }
        : blank,
    );
    update({ ...ex, evaluation: { ...ex.evaluation, blanks } });
  };

  const setTranslation = (fragment: RenderFragment) => {
    update({ ...ex, translation: fragment });
  };

  const setFeedback = (key: "correct" | "incorrect", fragment: RenderFragment) => {
    update({ ...ex, feedback: { ...ex.feedback, [key]: [fragment] } });
  };

  const tileItems = [
    { value: "", label: te.blankNone },
    ...bank.map((tile, index) => ({
      value: tile.id,
      label: fragmentLabel(tile.body[0], library) || format(te.tileLabel, { token: index + 1 }),
    })),
  ];

  const optionsSection = (
    <div className={styles.formGrid}>
      <FragmentField
        label={t.prompt}
        role="primary"
        fragment={ex.prompt[0]}
        library={library}
        onChange={setPrompt}
      />

      <Field label={te.sentenceLabel} help={te.sentenceHelp}>
        <TextArea
          value={sentence}
          rows={2}
          spellCheck={false}
          onChange={(event) => {
            onSentenceChange(event.currentTarget.value);
          }}
        />
      </Field>

      <div>
        <PanelHeader title={te.wordBankTitle} description={te.wordBankFillDesc} />
        <div className={styles.optionList}>
          {bank.map((tile, index) => (
            <div key={tile.id} className={styles.exerciseRow}>
              <FragmentField
                role="primary"
                fragment={tile.body[0]}
                library={library}
                onChange={(fragment) => {
                  setTileBody(tile.id, fragment);
                }}
                ariaLabel={format(te.tileLabel, { token: index + 1 })}
              />
              <IconButton
                aria-label={format(te.removeTile, { token: index + 1 })}
                size="sm"
                onClick={() => {
                  removeTile(tile.id);
                }}
              >
                <Icon name="close" size={18} />
              </IconButton>
            </div>
          ))}
        </div>
        <div className={styles.tokenList}>
          <Button variant="ghost" onClick={addTile}>
            <Icon name="plus" size={18} />
            {t.addTile}
          </Button>
        </div>
      </div>

      {ex.evaluation.blanks.length === 0 ? null : (
        <div>
          <PanelHeader title={te.blanksTitle} description={te.blanksDesc} />
          <div className={styles.settingGroup}>
            {ex.evaluation.blanks.map((blank, index) => (
              <div key={blank.blankId} className={styles.settingRow}>
                <span className={styles.settingName}>
                  {format(te.blankLabel, { blank: index + 1 })}
                </span>
                <Select
                  aria-label={format(te.blankCorrectFor, { blank: index + 1 })}
                  className={styles.optionRole}
                  value={blank.correctOptionIds?.[0] ?? ""}
                  onValueChange={(tileId) => {
                    setBlankCorrect(blank.blankId, tileId);
                  }}
                  items={tileItems}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <FragmentField
        label={te.translationLabel}
        help={te.translationHelp}
        role="translation"
        fragment={ex.translation}
        library={library}
        onChange={setTranslation}
      />
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
