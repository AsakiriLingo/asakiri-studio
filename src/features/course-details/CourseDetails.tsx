import { useEffect, useState, type ReactNode } from "react";
import type { Contributor, Course, CourseProject, FundingLink, Sponsor } from "@core/course";
import type { GitStatus } from "@core/project-system";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages, type StudioMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { Field, TextArea, TextInput } from "@shared/components/form";
import { Select, type SelectOption } from "@shared/components/select";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Status } from "@shared/components/status";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-details/CourseDetails.module.css";

type SaveState = "idle" | "saving" | "saved" | "failed";

const LICENSE_CODES = ["by", "bySa", "byNc", "byNcSa", "cc0", "arr"] as const;
type LicenseCode = (typeof LICENSE_CODES)[number];

function isLicenseCode(value: string): value is LicenseCode {
  return (LICENSE_CODES as readonly string[]).includes(value);
}

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function recordItems(record: Readonly<Record<string, string>>): SelectOption[] {
  return Object.entries(record).map(([value, label]) => ({ value, label }));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionGroup({
  title,
  titleId,
  description,
  children,
}: {
  readonly title: string;
  readonly titleId: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={styles.settingGroup} aria-labelledby={titleId}>
      <PanelHeader title={title} titleId={titleId} description={description} />
      {children}
    </section>
  );
}

function ContributorRow({
  contributor,
  messages,
  onChange,
  onRemove,
}: {
  readonly contributor: Contributor;
  readonly messages: StudioMessages;
  readonly onChange: (changes: Partial<Contributor>) => void;
  readonly onRemove: () => void;
}) {
  const t = messages.details;
  return (
    <div className={styles.contributorRow}>
      <span className={styles.contributorAvatar} aria-hidden="true">
        {initials(contributor.name)}
      </span>
      <span className={styles.contributorMain}>
        <span className={styles.rowFields}>
          <TextInput
            aria-label={t.nameLabel}
            defaultValue={contributor.name}
            placeholder={t.namePlaceholder}
            autoComplete="off"
            onBlur={(event) => {
              if (event.currentTarget.value !== contributor.name) {
                onChange({ name: event.currentTarget.value });
              }
            }}
          />
          <Select
            aria-label={t.roleLabel}
            items={recordItems(t.roles)}
            value={contributor.role}
            onValueChange={(role) => {
              onChange({ role });
            }}
          />
          <TextInput
            aria-label={t.linkLabel}
            defaultValue={contributor.links.join(", ")}
            placeholder={t.linksPlaceholder}
            autoComplete="off"
            onBlur={(event) => {
              onChange({
                links: event.currentTarget.value
                  .split(",")
                  .map((link) => link.trim())
                  .filter(Boolean),
              });
            }}
          />
        </span>
      </span>
      <IconButton
        aria-label={messages.common.remove(contributor.name || t.contributorsTitle)}
        onClick={onRemove}
      >
        <Icon name="trash" size={18} />
      </IconButton>
    </div>
  );
}

function FundingRow({
  entry,
  messages,
  onChange,
  onRemove,
}: {
  readonly entry: FundingLink;
  readonly messages: StudioMessages;
  readonly onChange: (changes: Partial<FundingLink>) => void;
  readonly onRemove: () => void;
}) {
  const t = messages.details;
  return (
    <div className={styles.fundingRow}>
      <span className={styles.fundingBadge}>
        <Icon name="heart" size={18} />
      </span>
      <span className={styles.fundingMain}>
        <span className={styles.rowFields}>
          <Select
            aria-label={t.platformLabel}
            items={recordItems(t.platforms)}
            value={entry.platform}
            onValueChange={(platform) => {
              onChange({ platform });
            }}
          />
          <TextInput
            aria-label={t.linkLabel}
            type="url"
            defaultValue={entry.url}
            placeholder={t.urlPlaceholder}
            autoComplete="off"
            onBlur={(event) => {
              if (event.currentTarget.value !== entry.url) {
                onChange({ url: event.currentTarget.value });
              }
            }}
          />
        </span>
      </span>
      <IconButton aria-label={messages.common.remove(t.fundingTitle)} onClick={onRemove}>
        <Icon name="trash" size={18} />
      </IconButton>
    </div>
  );
}

function SponsorRow({
  sponsor,
  messages,
  onChange,
  onRemove,
}: {
  readonly sponsor: Sponsor;
  readonly messages: StudioMessages;
  readonly onChange: (changes: Partial<Sponsor>) => void;
  readonly onRemove: () => void;
}) {
  const t = messages.details;
  return (
    <div className={styles.sponsorRow}>
      <span className={styles.sponsorLogo}>
        <Icon name="image" size={18} />
      </span>
      <span className={styles.sponsorMain}>
        <span className={styles.rowFields}>
          <TextInput
            aria-label={t.organizationLabel}
            defaultValue={sponsor.name}
            placeholder={t.orgPlaceholder}
            autoComplete="off"
            onBlur={(event) => {
              if (event.currentTarget.value !== sponsor.name) {
                onChange({ name: event.currentTarget.value });
              }
            }}
          />
          <Select
            aria-label={t.tierLabel}
            items={recordItems(t.tiers)}
            value={sponsor.tier}
            onValueChange={(tier) => {
              onChange({ tier });
            }}
          />
          <TextInput
            aria-label={t.linkLabel}
            type="url"
            defaultValue={sponsor.url}
            placeholder={t.urlPlaceholder}
            autoComplete="off"
            onBlur={(event) => {
              if (event.currentTarget.value !== sponsor.url) {
                onChange({ url: event.currentTarget.value });
              }
            }}
          />
        </span>
      </span>
      <IconButton
        aria-label={messages.common.remove(sponsor.name || t.sponsorsTitle)}
        onClick={onRemove}
      >
        <Icon name="trash" size={18} />
      </IconButton>
    </div>
  );
}

export interface CourseDetailsProps {
  readonly course: Course;
  readonly location: string;
  readonly onSaveProject: (project: CourseProject) => Promise<ProjectWriteResult>;
  readonly onRevealFolder: () => void;
  readonly onReadGitStatus: () => Promise<GitStatus>;
}

export function CourseDetails({
  course,
  location,
  onSaveProject,
  onRevealFolder,
  onReadGitStatus,
}: CourseDetailsProps) {
  const messages = useMessages();
  const t = messages.details;
  const { project } = course;
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [git, setGit] = useState<GitStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void onReadGitStatus().then((status) => {
      if (!cancelled) setGit(status);
    });
    return () => {
      cancelled = true;
    };
  }, [onReadGitStatus]);

  const save = (next: CourseProject) => {
    setSaveState("saving");
    void onSaveProject(next).then((result) => {
      setSaveState(result.status === "saved" ? "saved" : "failed");
    });
  };
  const patch = (changes: Partial<CourseProject>) => {
    save({ ...project, ...changes });
  };
  const patchField = (
    field:
      | "title"
      | "subtitle"
      | "description"
      | "estimatedLength"
      | "copyrightHolder"
      | "copyrightYear",
    value: string,
  ) => {
    if (value !== project[field]) patch({ [field]: value });
  };

  const imageAssets = course.assets.filter((asset) => asset.kind === "image");
  const coverAsset = imageAssets.find((asset) => asset.id === project.coverAssetId) ?? null;
  const coverItems: SelectOption[] = imageAssets.map((asset) => ({
    value: asset.id,
    label: asset.file ?? asset.label,
  }));

  const primaryCollection = course.collections[0];
  const recordCount = primaryCollection
    ? course.records.filter((record) => record.collectionId === primaryCollection.id).length
    : 0;

  const statusLabel =
    saveState === "saving"
      ? messages.common.saving
      : saveState === "failed"
        ? messages.common.saveFailed
        : messages.common.savedLocally;

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Status tone={saveState === "failed" ? "warning" : "default"}>{statusLabel}</Status>
        }
      />

      <div className={styles.settingsStack}>
        <SectionGroup
          title={t.overviewTitle}
          titleId="overview-title"
          description={t.overviewDescription}
        >
          <div className={joinClassNames(styles.formGrid, styles.detailBody)}>
            <Field label={t.fieldTitle} help={t.fieldTitleHelp}>
              <TextInput
                name="title"
                defaultValue={project.title}
                autoComplete="off"
                onBlur={(event) => {
                  patchField("title", event.currentTarget.value);
                }}
              />
            </Field>
            <Field label={t.fieldSubtitle} help={t.fieldSubtitleHelp}>
              <TextInput
                name="subtitle"
                defaultValue={project.subtitle}
                autoComplete="off"
                onBlur={(event) => {
                  patchField("subtitle", event.currentTarget.value);
                }}
              />
            </Field>
            <Field label={t.fieldDescription} help={t.fieldDescriptionHelp}>
              <TextArea
                name="description"
                rows={3}
                defaultValue={project.description}
                onBlur={(event) => {
                  patchField("description", event.currentTarget.value);
                }}
              />
            </Field>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.languageTitle}
          titleId="language-title"
          description={t.languageDescription}
        >
          <div className={joinClassNames(styles.formGrid, styles.two, styles.detailBody)}>
            <Field label={t.fieldTaught} help={t.fieldTaughtHelp}>
              <TextInput
                name="target-language"
                defaultValue={project.learningLocales[0] ?? ""}
                autoComplete="off"
                onBlur={(event) => {
                  const value = event.currentTarget.value;
                  if (value !== (project.learningLocales[0] ?? "")) {
                    patch({ learningLocales: [value, ...project.learningLocales.slice(1)] });
                  }
                }}
              />
            </Field>
            <Field label={t.fieldExplained} help={t.fieldExplainedHelp}>
              <TextInput
                name="source-language"
                defaultValue={project.defaultLocale}
                autoComplete="off"
                onBlur={(event) => {
                  if (event.currentTarget.value !== project.defaultLocale) {
                    patch({ defaultLocale: event.currentTarget.value });
                  }
                }}
              />
            </Field>
            <Field label={t.fieldLevel} help={t.fieldLevelHelp}>
              <Select
                aria-label={t.fieldLevel}
                items={[
                  { value: "a1", label: t.levelA1 },
                  { value: "a2", label: t.levelA2 },
                  { value: "b1", label: t.levelB1 },
                ]}
                value={project.level}
                onValueChange={(level) => {
                  patch({ level });
                }}
              />
            </Field>
            <Field label={t.fieldLength} help={t.fieldLengthHelp}>
              <TextInput
                name="length"
                defaultValue={project.estimatedLength}
                autoComplete="off"
                onBlur={(event) => {
                  patchField("estimatedLength", event.currentTarget.value);
                }}
              />
            </Field>
          </div>
        </SectionGroup>

        <SectionGroup title={t.coverTitle} titleId="cover-title" description={t.coverDescription}>
          <div className={styles.detailBody}>
            <div className={styles.inlineActions}>
              <span className={styles.assetRef}>
                <Icon name="image" size={16} />
                {coverAsset ? (coverAsset.file ?? coverAsset.label) : t.noCover}
              </span>
              <Select
                aria-label={t.chooseMedia}
                items={coverItems}
                placeholder={t.chooseMedia}
                value={project.coverAssetId ?? ""}
                onValueChange={(assetId) => {
                  patch({ coverAssetId: assetId || null });
                }}
              />
              {project.coverAssetId === null ? null : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    patch({ coverAssetId: null });
                  }}
                >
                  {t.remove}
                </Button>
              )}
            </div>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.contributorsTitle}
          titleId="contributors-title"
          description={t.contributorsDescription}
        >
          {project.contributors.map((contributor) => (
            <ContributorRow
              key={contributor.id}
              contributor={contributor}
              messages={messages}
              onChange={(changes) => {
                patch({
                  contributors: project.contributors.map((item) =>
                    item.id === contributor.id ? { ...item, ...changes } : item,
                  ),
                });
              }}
              onRemove={() => {
                patch({
                  contributors: project.contributors.filter((item) => item.id !== contributor.id),
                });
              }}
            />
          ))}
          <div className={styles.detailBody}>
            <Button
              variant="secondary"
              onClick={() => {
                patch({
                  contributors: [
                    ...project.contributors,
                    { id: crypto.randomUUID(), name: "", role: "author", links: [] },
                  ],
                });
              }}
            >
              <Icon name="plus" size={18} />
              {messages.common.add}
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.fundingTitle}
          titleId="funding-title"
          description={t.fundingDescription}
        >
          {project.funding.map((entry) => (
            <FundingRow
              key={entry.id}
              entry={entry}
              messages={messages}
              onChange={(changes) => {
                patch({
                  funding: project.funding.map((item) =>
                    item.id === entry.id ? { ...item, ...changes } : item,
                  ),
                });
              }}
              onRemove={() => {
                patch({ funding: project.funding.filter((item) => item.id !== entry.id) });
              }}
            />
          ))}
          <div className={styles.detailBody}>
            <Button
              variant="secondary"
              onClick={() => {
                patch({
                  funding: [
                    ...project.funding,
                    { id: crypto.randomUUID(), platform: "githubSponsors", url: "" },
                  ],
                });
              }}
            >
              <Icon name="plus" size={18} />
              {messages.common.add}
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.sponsorsTitle}
          titleId="sponsors-title"
          description={t.sponsorsDescription}
        >
          {project.sponsors.map((sponsor) => (
            <SponsorRow
              key={sponsor.id}
              sponsor={sponsor}
              messages={messages}
              onChange={(changes) => {
                patch({
                  sponsors: project.sponsors.map((item) =>
                    item.id === sponsor.id ? { ...item, ...changes } : item,
                  ),
                });
              }}
              onRemove={() => {
                patch({ sponsors: project.sponsors.filter((item) => item.id !== sponsor.id) });
              }}
            />
          ))}
          <div className={styles.detailBody}>
            <Button
              variant="secondary"
              onClick={() => {
                patch({
                  sponsors: [
                    ...project.sponsors,
                    { id: crypto.randomUUID(), name: "", tier: "gold", url: "" },
                  ],
                });
              }}
            >
              <Icon name="plus" size={18} />
              {messages.common.add}
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.licenseTitle}
          titleId="license-title"
          description={t.licenseDescription}
        >
          <div className={joinClassNames(styles.formGrid, styles.two, styles.detailBody)}>
            <Field label={t.licenseLabel} className={styles.spanAll} help={t.licenseHelp}>
              <Select
                aria-label={t.licenseLabel}
                items={LICENSE_CODES.map((code) => ({ value: code, label: t.licenses[code] }))}
                value={project.license}
                onValueChange={(license) => {
                  patch({ license });
                }}
              />
            </Field>
            <Field label={t.copyrightHolder}>
              <TextInput
                name="copyright-holder"
                defaultValue={project.copyrightHolder}
                autoComplete="off"
                onBlur={(event) => {
                  patchField("copyrightHolder", event.currentTarget.value);
                }}
              />
            </Field>
            <Field label={t.yearLabel}>
              <TextInput
                name="copyright-year"
                defaultValue={project.copyrightYear}
                inputMode="numeric"
                autoComplete="off"
                onBlur={(event) => {
                  patchField("copyrightYear", event.currentTarget.value);
                }}
              />
            </Field>
            {isLicenseCode(project.license) ? (
              <Callout icon="details" className={styles.spanAll}>
                <strong>{t.licenses[project.license]}</strong>
                {t.licenseSummaries[project.license]}
              </Callout>
            ) : null}
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.projectTitle}
          titleId="project-title"
          description={t.projectDescription}
        >
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>{t.folder}</span>
              <span className={joinClassNames(styles.settingDetail, styles.mono)}>{location}</span>
            </span>
            <Button variant="ghost" onClick={onRevealFolder}>
              {messages.common.reveal}
            </Button>
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>{t.versionControl}</span>
              <span className={styles.settingDetail}>
                {git === null ? "" : git.initialized ? t.gitInitialized(git.commitCount) : t.noGit}
              </span>
            </span>
            {git?.initialized ? (
              git.clean ? (
                <Status>{t.clean}</Status>
              ) : (
                <Status tone="warning">{t.uncommitted}</Status>
              )
            ) : null}
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>{t.contentRecords}</span>
              <span className={styles.settingDetail}>
                {t.recordSummary(recordCount, primaryCollection?.name ?? t.noCollections)} ·{" "}
                {t.mediaFiles(course.assets.length)}
              </span>
            </span>
          </div>
        </SectionGroup>
      </div>
    </WorkInner>
  );
}
