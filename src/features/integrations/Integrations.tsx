import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { PasswordInput } from "@shared/components/form";
import { Icon, type IconName } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Status, type StatusTone } from "@shared/components/status";
import { Tag, type TagVariant } from "@shared/components/tag";
import { WorkHeader } from "@shared/components/work-surface";
import styles from "@features/integrations/Integrations.module.css";

interface MetaTag {
  readonly label: string;
  readonly variant: TagVariant;
}

interface KeyField {
  readonly value?: string;
  readonly placeholder?: string;
  readonly buttonLabel: string;
  readonly ariaLabel: string;
}

interface Provider {
  readonly icon: IconName;
  readonly name: string;
  readonly detail: string;
  readonly meta: readonly MetaTag[];
  readonly statusLabel: string;
  readonly statusTone: StatusTone;
  readonly action?: string;
  readonly key?: KeyField;
}

interface Group {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly providers: readonly Provider[];
}

const GROUPS: readonly Group[] = [
  {
    id: "images",
    title: "Images",
    description: "Search photos to attach to vocabulary and covers.",
    providers: [
      {
        icon: "image",
        name: "Unsplash",
        detail: "Royalty-free photography. Good for lesson covers and real objects.",
        meta: [
          { label: "Images", variant: "default" },
          { label: "BYOK", variant: "default" },
        ],
        statusLabel: "Connected",
        statusTone: "default",
        action: "Disconnect",
        key: {
          value: "ak-live-8f2c4d9b6a1e",
          buttonLabel: "Update",
          ariaLabel: "Unsplash access key",
        },
      },
      {
        icon: "image",
        name: "Pixabay",
        detail: "Photos plus simple illustrations and clip-art style images.",
        meta: [
          { label: "Images", variant: "default" },
          { label: "BYOK", variant: "default" },
        ],
        statusLabel: "Not connected",
        statusTone: "warning",
        key: {
          placeholder: "Paste your Pixabay API key",
          buttonLabel: "Connect",
          ariaLabel: "Pixabay API key",
        },
      },
    ],
  },
  {
    id: "sentences",
    title: "Example sentences",
    description: "Pull real sentences with translations into exercises.",
    providers: [
      {
        icon: "content",
        name: "Tatoeba",
        detail:
          "Community sentence bank with translations. No key required — attribution is added automatically.",
        meta: [
          { label: "Sentences", variant: "default" },
          { label: "Free · CC-BY", variant: "default" },
        ],
        statusLabel: "Enabled",
        statusTone: "default",
        action: "Disable",
      },
    ],
  },
  {
    id: "ai",
    title: "AI · bring your own key",
    description:
      "Draft translations, hints, and example sentences. Choose one provider; requests use your key and account.",
    providers: [
      {
        icon: "sparkles",
        name: "Anthropic · Claude",
        detail: "Strong at natural translations and learner-friendly explanations.",
        meta: [
          { label: "AI", variant: "default" },
          { label: "BYOK", variant: "default" },
          { label: "Active", variant: "accent" },
        ],
        statusLabel: "Connected",
        statusTone: "default",
        action: "Disconnect",
        key: {
          value: "sk-ant-4a2f9c7e1d6b",
          buttonLabel: "Update",
          ariaLabel: "Anthropic API key",
        },
      },
      {
        icon: "sparkles",
        name: "OpenAI",
        detail: "GPT models for drafting content and alternate phrasings.",
        meta: [
          { label: "AI", variant: "default" },
          { label: "BYOK", variant: "default" },
        ],
        statusLabel: "Not connected",
        statusTone: "warning",
        key: {
          placeholder: "Paste your OpenAI API key",
          buttonLabel: "Connect",
          ariaLabel: "OpenAI API key",
        },
      },
      {
        icon: "sparkles",
        name: "Google · Gemini",
        detail: "Gemini models, including fast low-cost options for bulk drafts.",
        meta: [
          { label: "AI", variant: "default" },
          { label: "BYOK", variant: "default" },
        ],
        statusLabel: "Not connected",
        statusTone: "warning",
        key: {
          placeholder: "Paste your Google AI API key",
          buttonLabel: "Connect",
          ariaLabel: "Google AI API key",
        },
      },
    ],
  },
];

export interface IntegrationsProps {
  readonly isDark: boolean;
  readonly onBack: () => void;
  readonly onToggleTheme: () => void;
}

export function Integrations({ isDark, onBack, onToggleTheme }: IntegrationsProps) {
  return (
    <main className={styles.hub}>
      <div className={styles.tools}>
        <IconButton aria-label="Back to Start" onClick={onBack}>
          <Icon name="back" size={18} />
        </IconButton>
        <IconButton
          aria-label={isDark ? "Use light theme" : "Use dark theme"}
          onClick={onToggleTheme}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </IconButton>
      </div>
      <div className={styles.inner}>
        <WorkHeader
          title="Integrations"
          description="App-level connections shared by every course on this device. Optional — Studio works fully offline without them."
        />

        <div className={styles.stack}>
          <Callout icon="integrations">
            <strong>Keys stay on this device.</strong>
            <br />
            API keys are saved to your Studio app settings, not to any course folder, and are never
            uploaded. Every course you open reuses the same connections.
          </Callout>

          {GROUPS.map((group) => (
            <section key={group.id} className={styles.group} aria-labelledby={`${group.id}-title`}>
              <PanelHeader
                title={group.title}
                titleId={`${group.id}-title`}
                description={group.description}
              />
              {group.providers.map((provider) => (
                <div key={provider.name} className={styles.row}>
                  <div className={styles.main}>
                    <span className={styles.badge}>
                      <Icon name={provider.icon} size={18} />
                    </span>
                    <span>
                      <span className={styles.name}>{provider.name}</span>{" "}
                      <span className={styles.detail}>{provider.detail}</span>
                      <span className={styles.meta}>
                        {provider.meta.map((tag) => (
                          <Tag key={tag.label} variant={tag.variant}>
                            {tag.label}
                          </Tag>
                        ))}
                      </span>
                    </span>
                    <span className={styles.actions}>
                      <Status tone={provider.statusTone}>{provider.statusLabel}</Status>
                      {provider.action === undefined ? null : (
                        <Button variant="ghost">{provider.action}</Button>
                      )}
                    </span>
                  </div>
                  {provider.key === undefined ? null : (
                    <div className={styles.key}>
                      <PasswordInput
                        className={styles.keyInput}
                        aria-label={provider.key.ariaLabel}
                        defaultValue={provider.key.value ?? ""}
                        placeholder={provider.key.placeholder ?? ""}
                        readOnly={provider.key.value !== undefined}
                      />
                      <Button variant="secondary">{provider.key.buttonLabel}</Button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
