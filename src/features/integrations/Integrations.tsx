import { useMessages } from "@shared/i18n";
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

type MetaKey = "images" | "byok" | "sentences" | "freeCcBy" | "ai" | "active";
type ProviderId = "unsplash" | "pixabay" | "tatoeba" | "anthropic" | "openai" | "gemini";
type GroupId = "images" | "sentences" | "ai";

interface ProviderDef {
  readonly id: ProviderId;
  readonly icon: IconName;
  readonly name: string;
  readonly meta: readonly { readonly key: MetaKey; readonly variant: TagVariant }[];
  readonly statusKey: "connected" | "notConnected" | "enabled";
  readonly statusTone: StatusTone;
  readonly actionKey?: "disconnect" | "connect" | "disable";
  readonly key?: { readonly value?: string };
}

interface GroupDef {
  readonly id: GroupId;
  readonly providers: readonly ProviderDef[];
}

// Provider identity only; all display text comes from the message catalog.
const GROUPS: readonly GroupDef[] = [
  {
    id: "images",
    providers: [
      {
        id: "unsplash",
        icon: "image",
        name: "Unsplash",
        meta: [
          { key: "images", variant: "default" },
          { key: "byok", variant: "default" },
        ],
        statusKey: "connected",
        statusTone: "default",
        actionKey: "disconnect",
        key: { value: "ak-live-8f2c4d9b6a1e" },
      },
      {
        id: "pixabay",
        icon: "image",
        name: "Pixabay",
        meta: [
          { key: "images", variant: "default" },
          { key: "byok", variant: "default" },
        ],
        statusKey: "notConnected",
        statusTone: "warning",
        key: {},
      },
    ],
  },
  {
    id: "sentences",
    providers: [
      {
        id: "tatoeba",
        icon: "content",
        name: "Tatoeba",
        meta: [
          { key: "sentences", variant: "default" },
          { key: "freeCcBy", variant: "default" },
        ],
        statusKey: "enabled",
        statusTone: "default",
        actionKey: "disable",
      },
    ],
  },
  {
    id: "ai",
    providers: [
      {
        id: "anthropic",
        icon: "sparkles",
        name: "Anthropic · Claude",
        meta: [
          { key: "ai", variant: "default" },
          { key: "byok", variant: "default" },
          { key: "active", variant: "accent" },
        ],
        statusKey: "connected",
        statusTone: "default",
        actionKey: "disconnect",
        key: { value: "sk-ant-4a2f9c7e1d6b" },
      },
      {
        id: "openai",
        icon: "sparkles",
        name: "OpenAI",
        meta: [
          { key: "ai", variant: "default" },
          { key: "byok", variant: "default" },
        ],
        statusKey: "notConnected",
        statusTone: "warning",
        key: {},
      },
      {
        id: "gemini",
        icon: "sparkles",
        name: "Google · Gemini",
        meta: [
          { key: "ai", variant: "default" },
          { key: "byok", variant: "default" },
        ],
        statusKey: "notConnected",
        statusTone: "warning",
        key: {},
      },
    ],
  },
];

export interface IntegrationsProps {
  readonly isDark: boolean;
  readonly onBack: () => void;
  readonly onToggleTheme: () => void;
  readonly onToggleLocale: () => void;
}

export function Integrations({ isDark, onBack, onToggleTheme, onToggleLocale }: IntegrationsProps) {
  const messages = useMessages();
  const t = messages.integrations;

  return (
    <main className={styles.hub}>
      <div className={styles.tools}>
        <IconButton aria-label={messages.common.backToStart} onClick={onBack}>
          <Icon name="back" size={18} />
        </IconButton>
        <IconButton aria-label={messages.switchLanguage} onClick={onToggleLocale}>
          <Icon name="language" size={18} />
        </IconButton>
        <IconButton
          aria-label={isDark ? messages.common.useLightTheme : messages.common.useDarkTheme}
          onClick={onToggleTheme}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </IconButton>
      </div>
      <div className={styles.inner}>
        <WorkHeader title={t.title} description={t.description} />

        <div className={styles.stack}>
          <Callout icon="integrations">
            <strong>{t.calloutTitle}</strong>
            {t.calloutBody}
          </Callout>

          {GROUPS.map((group) => (
            <section key={group.id} className={styles.group} aria-labelledby={`${group.id}-title`}>
              <PanelHeader
                title={t.groups[group.id].title}
                titleId={`${group.id}-title`}
                description={t.groups[group.id].description}
              />
              {group.providers.map((provider) => (
                <div key={provider.id} className={styles.row}>
                  <div className={styles.main}>
                    <span className={styles.badge}>
                      <Icon name={provider.icon} size={18} />
                    </span>
                    <span>
                      <span className={styles.name}>{provider.name}</span>{" "}
                      <span className={styles.detail}>{t.providers[provider.id]}</span>
                      <span className={styles.meta}>
                        {provider.meta.map((tag) => (
                          <Tag key={tag.key} variant={tag.variant}>
                            {t.meta[tag.key]}
                          </Tag>
                        ))}
                      </span>
                    </span>
                    <span className={styles.actions}>
                      <Status tone={provider.statusTone}>{t.status[provider.statusKey]}</Status>
                      {provider.actionKey === undefined ? null : (
                        <Button variant="ghost">{t.action[provider.actionKey]}</Button>
                      )}
                    </span>
                  </div>
                  {provider.key === undefined ? null : (
                    <div className={styles.key}>
                      <PasswordInput
                        className={styles.keyInput}
                        aria-label={t.keyAria(provider.name)}
                        defaultValue={provider.key.value ?? ""}
                        placeholder={
                          provider.key.value === undefined ? t.keyPlaceholder(provider.name) : ""
                        }
                        readOnly={provider.key.value !== undefined}
                      />
                      <Button variant="secondary">
                        {provider.key.value === undefined ? t.action.connect : t.action.update}
                      </Button>
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
