import { useEffect, useState } from "react";
import type { Binding, RenderFragment } from "@core/course";
import {
  useAssetPreview,
  type EditorAsset,
  type RichEditorLibrary,
} from "@shared/components/rich-editor";
import { useMessages } from "@shared/i18n";
import { TextInput } from "@shared/components/form";
import { Icon } from "@shared/components/icon";
import { Select } from "@shared/components/select";
import {
  WHOLE_RECORD,
  assetBinding,
  fieldBinding,
  fragmentSource,
  literalText,
  recordBinding,
  textBinding,
  withBinding,
  type FragmentSource,
} from "@features/lesson-editor/exercise/fragment-model";
import styles from "@features/lesson-editor/LessonEditor.module.css";

function AssetOptionThumb({ asset }: { readonly asset: EditorAsset }) {
  const loadPreview = useAssetPreview();
  const [url, setUrl] = useState<string | null>(null);
  const previewable = asset.kind === "image" && asset.file !== null;

  useEffect(() => {
    if (!previewable) return;
    let cancelled = false;
    void loadPreview(asset.id).then((next) => {
      if (!cancelled && next) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id, previewable, loadPreview]);

  if (url) {
    return <img className={styles.assetOptionThumb} src={url} alt="" loading="lazy" />;
  }
  return (
    <span className={styles.assetOptionIcon}>
      <Icon name={asset.kind} size={14} />
    </span>
  );
}

export interface FragmentFieldProps {
  readonly fragment: RenderFragment | undefined;
  readonly role: string;
  readonly library: RichEditorLibrary;
  readonly onChange: (fragment: RenderFragment) => void;
  readonly label?: string;
  readonly help?: string;
  readonly ariaLabel?: string;
  readonly defaultSource?: FragmentSource | undefined;
}

export function FragmentField({
  fragment,
  role,
  library,
  onChange,
  label,
  help,
  ariaLabel,
  defaultSource,
}: FragmentFieldProps) {
  const messages = useMessages();
  const t = messages.lesson.fragment;
  const binding = fragment?.binding;

  const [source, setSource] = useState<FragmentSource>(() => {
    if (!binding) return defaultSource ?? "text";
    if (defaultSource && binding.kind === "literal" && literalText(binding) === "") {
      return defaultSource;
    }
    return fragmentSource(binding);
  });
  const [text, setText] = useState(binding ? literalText(binding) : "");
  const [recordId, setRecordId] = useState(
    binding?.kind === "field" || binding?.kind === "record" ? binding.recordId : "",
  );
  const [fieldId, setFieldId] = useState(
    binding?.kind === "field" ? binding.fieldId : WHOLE_RECORD,
  );
  const [assetId, setAssetId] = useState(binding?.kind === "asset" ? binding.assetId : "");

  const record = library.records.find((entry) => entry.id === recordId);
  const fields = record
    ? (library.collections.find((collection) => collection.id === record.collectionId)?.fields ??
      [])
    : [];

  const emit = (next: Binding) => {
    onChange(withBinding(fragment, role, next));
  };

  return (
    <div className={styles.fragmentGroup}>
      {label === undefined ? null : <span className={styles.fragmentLabel}>{label}</span>}
      <div className={styles.fragmentField}>
        <Select
          aria-label={t.source}
          className={styles.fragmentSource}
          value={source}
          onValueChange={(next) => {
            const value = next as FragmentSource;
            setSource(value);
            if (value === "text") emit(textBinding(text));
            else if (value === "asset") {
              if (assetId) emit(assetBinding(assetId));
            } else if (recordId) {
              emit(
                fieldId === WHOLE_RECORD
                  ? recordBinding(recordId)
                  : fieldBinding(recordId, fieldId),
              );
            }
          }}
          items={[
            { value: "text", label: t.sourceText },
            { value: "content", label: t.sourceContent },
            { value: "asset", label: t.sourceAsset },
          ]}
        />
        {source === "text" ? (
          <TextInput
            value={text}
            placeholder={t.textPlaceholder}
            aria-label={ariaLabel ?? t.textPlaceholder}
            onChange={(event) => {
              setText(event.currentTarget.value);
              emit(textBinding(event.currentTarget.value));
            }}
          />
        ) : source === "content" ? (
          <>
            <Select
              searchable
              aria-label={t.entry}
              placeholder={t.pickRecord}
              value={recordId}
              onValueChange={(id) => {
                setRecordId(id);
                setFieldId(WHOLE_RECORD);
                if (id) emit(recordBinding(id));
              }}
              items={library.records.map((entry) => ({ value: entry.id, label: entry.label }))}
            />
            {record ? (
              <Select
                aria-label={t.field}
                value={fieldId}
                onValueChange={(id) => {
                  setFieldId(id);
                  emit(id === WHOLE_RECORD ? recordBinding(recordId) : fieldBinding(recordId, id));
                }}
                items={[
                  { value: WHOLE_RECORD, label: t.wholeRecord },
                  ...fields.map((entry) => ({ value: entry.id, label: entry.name })),
                ]}
              />
            ) : null}
          </>
        ) : (
          <Select
            searchable
            aria-label={t.asset}
            placeholder={t.pickAsset}
            value={assetId}
            onValueChange={(id) => {
              setAssetId(id);
              if (id) emit(assetBinding(id));
            }}
            items={library.assets.map((entry) => ({
              value: entry.id,
              label: entry.label,
              leading: <AssetOptionThumb asset={entry} />,
            }))}
          />
        )}
      </div>
      {help === undefined ? null : <span className={styles.rowDetail}>{help}</span>}
    </div>
  );
}
