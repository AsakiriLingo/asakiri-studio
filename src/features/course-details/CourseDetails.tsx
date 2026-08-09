import type { ReactNode } from "react";
import type { Course } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { Field, TextArea, TextInput } from "@shared/components/form";
import { Select, type SelectOption } from "@shared/components/select";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Status } from "@shared/components/status";
import { Tag, type TagVariant } from "@shared/components/tag";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/course-details/CourseDetails.module.css";

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

function recordItems(record: Readonly<Record<string, string>>): SelectOption[] {
  return Object.entries(record).map(([value, label]) => ({ value, label }));
}

function localeName(code: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
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

function AssetLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <a className={styles.assetRef} href={href} target="_blank" rel="noreferrer">
      <Icon name="external" size={16} />
      {label}
    </a>
  );
}

function RowActions({ removeLabel }: { readonly removeLabel: string }) {
  const messages = useMessages();
  return (
    <span className={styles.inlineActions}>
      <Button variant="ghost">{messages.common.edit}</Button>
      <IconButton aria-label={removeLabel}>
        <Icon name="trash" size={18} />
      </IconButton>
    </span>
  );
}

interface Contributor {
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly roleVariant: TagVariant;
  readonly links: readonly string[];
}

const CONTRIBUTORS: readonly Contributor[] = [
  {
    initials: "AS",
    name: "Alok Singh",
    role: "Author",
    roleVariant: "accent",
    links: ["github.com/aloksingh", "aloksingh.dev"],
  },
  {
    initials: "KI",
    name: "Kenji Ito",
    role: "Translator",
    roleVariant: "default",
    links: ["kenji-ito.example"],
  },
  {
    initials: "HS",
    name: "Hana Suzuki",
    role: "Voice",
    roleVariant: "default",
    links: ["hanasuzuki.example", "soundcloud.com/hanasuzuki"],
  },
  {
    initials: "MT",
    name: "Mei Tanaka",
    role: "Illustrator",
    roleVariant: "default",
    links: ["dribbble.com/meitanaka", "instagram.com/mei.draws"],
  },
];

const FUNDING: readonly { readonly name: string; readonly url: string }[] = [
  { name: "GitHub Sponsors", url: "github.com/sponsors/aloksingh" },
  { name: "Ko-fi", url: "ko-fi.com/aloksingh" },
  { name: "Open Collective", url: "opencollective.com/asakiri" },
];

interface Sponsor {
  readonly file: string;
  readonly name: string;
  readonly tier: string;
  readonly tierVariant: TagVariant;
  readonly url: string;
}

const SPONSORS: readonly Sponsor[] = [
  {
    file: "nihongo.svg",
    name: "The Nihongo Foundation",
    tier: "Gold",
    tierVariant: "accent",
    url: "nihongo-foundation.example",
  },
  {
    file: "sakura.svg",
    name: "Sakura Press",
    tier: "Supporter",
    tierVariant: "default",
    url: "sakurapress.example",
  },
];

export interface CourseDetailsProps {
  readonly course: Course;
  readonly location: string;
}

export function CourseDetails({ course, location }: CourseDetailsProps) {
  const messages = useMessages();
  const t = messages.details;
  const { project } = course;
  const taught = project.learningLocales[0] ?? "";

  const levelItems: SelectOption[] = [
    { value: "a1", label: t.levelA1 },
    { value: "a2", label: t.levelA2 },
    { value: "b1", label: t.levelB1 },
  ];
  const licenseItems: SelectOption[] = [
    { value: "by", label: t.licenses.by },
    { value: "bySa", label: t.licenses.bySa },
    { value: "byNc", label: t.licenses.byNc },
    { value: "byNcSa", label: t.licenses.byNcSa },
    { value: "cc0", label: t.licenses.cc0 },
    { value: "arr", label: t.licenses.arr },
  ];

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={<Status>{messages.common.savedLocally}</Status>}
      />

      <div className={styles.settingsStack}>
        <SectionGroup
          title={t.overviewTitle}
          titleId="overview-title"
          description={t.overviewDescription}
        >
          <div className={joinClassNames(styles.formGrid, styles.detailBody)}>
            <Field label={t.fieldTitle} help={t.fieldTitleHelp}>
              <TextInput name="title" defaultValue={project.title} autoComplete="off" />
            </Field>
            <Field label={t.fieldSubtitle} help={t.fieldSubtitleHelp}>
              <TextInput
                name="subtitle"
                defaultValue="Your first words and sentences"
                autoComplete="off"
              />
            </Field>
            <Field label={t.fieldDescription} help={t.fieldDescriptionHelp}>
              <TextArea name="description" rows={3} defaultValue={project.description} />
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
                defaultValue={localeName(taught)}
                autoComplete="off"
              />
            </Field>
            <Field label={t.fieldExplained} help={t.fieldExplainedHelp}>
              <TextInput
                name="source-language"
                defaultValue={localeName(project.defaultLocale)}
                autoComplete="off"
              />
            </Field>
            <Field label={t.fieldLevel} help={t.fieldLevelHelp}>
              <Select name="level" defaultValue="a1" aria-label={t.fieldLevel} items={levelItems} />
            </Field>
            <Field label={t.fieldLength} help={t.fieldLengthHelp}>
              <TextInput name="length" defaultValue="2 units · 3 lessons" autoComplete="off" />
            </Field>
          </div>
        </SectionGroup>

        <SectionGroup title={t.coverTitle} titleId="cover-title" description={t.coverDescription}>
          <div className={styles.detailBody}>
            <div className={styles.inlineActions}>
              <span className={styles.assetRef}>
                <Icon name="image" size={16} />
                cover-torii.jpg
              </span>
              <Button variant="secondary">{t.chooseMedia}</Button>
              <Button variant="ghost">{t.remove}</Button>
            </div>
          </div>
        </SectionGroup>

        <SectionGroup
          title={t.contributorsTitle}
          titleId="contributors-title"
          description={t.contributorsDescription}
        >
          {CONTRIBUTORS.map((person) => (
            <div key={person.name} className={styles.contributorRow}>
              <span className={styles.contributorAvatar} aria-hidden="true">
                {person.initials}
              </span>
              <span className={styles.contributorMain}>
                <span className={styles.contributorHead}>
                  <span className={styles.rowTitle}>{person.name}</span>
                  <Tag variant={person.roleVariant}>{person.role}</Tag>
                </span>
                <span className={styles.contributorLinks}>
                  {person.links.map((link) => (
                    <AssetLink key={link} href={`https://${link}`} label={link} />
                  ))}
                  <button className={styles.linkAdd} type="button">
                    <Icon name="plus" size={14} />
                    {messages.common.addLink}
                  </button>
                </span>
              </span>
              <RowActions removeLabel={messages.common.remove(person.name)} />
            </div>
          ))}
          <div className={styles.contributorAdd}>
            <button className={styles.avatarAdd} type="button" aria-label={t.addPhoto}>
              <Icon name="image" size={18} />
            </button>
            <Field label={t.roleLabel}>
              <Select
                name="contributor-role"
                defaultValue="author"
                aria-label={t.roleLabel}
                items={recordItems(t.roles)}
              />
            </Field>
            <Field label={t.nameLabel}>
              <TextInput
                name="contributor-name"
                placeholder={t.namePlaceholder}
                autoComplete="off"
              />
            </Field>
            <Field label={t.linkLabel}>
              <TextInput
                name="contributor-link"
                type="url"
                placeholder={t.urlPlaceholder}
                autoComplete="off"
              />
            </Field>
            <Button variant="secondary">
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
          {FUNDING.map((entry) => (
            <div key={entry.name} className={styles.fundingRow}>
              <span className={styles.fundingBadge}>
                <Icon name="heart" size={18} />
              </span>
              <span className={styles.fundingMain}>
                <span className={styles.rowTitle}>{entry.name}</span>
                <AssetLink href={`https://${entry.url}`} label={entry.url} />
              </span>
              <RowActions removeLabel={messages.common.remove(entry.name)} />
            </div>
          ))}
          <div className={styles.fundingAdd}>
            <Field label={t.platformLabel}>
              <Select
                name="funding-platform"
                defaultValue="githubSponsors"
                aria-label={t.platformLabel}
                items={recordItems(t.platforms)}
              />
            </Field>
            <Field label={t.linkLabel}>
              <TextInput
                name="funding-link"
                type="url"
                placeholder={t.urlPlaceholder}
                autoComplete="off"
              />
            </Field>
            <Button variant="secondary">
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
          {SPONSORS.map((sponsor) => (
            <div key={sponsor.name} className={styles.sponsorRow}>
              <span className={styles.sponsorLogo}>
                <Icon name="image" size={18} />
                <span className={styles.file}>{sponsor.file}</span>
              </span>
              <span className={styles.sponsorMain}>
                <span className={styles.sponsorHead}>
                  <span className={styles.rowTitle}>{sponsor.name}</span>
                  <Tag variant={sponsor.tierVariant}>{sponsor.tier}</Tag>
                </span>
                <AssetLink href={`https://${sponsor.url}`} label={sponsor.url} />
              </span>
              <RowActions removeLabel={messages.common.remove(sponsor.name)} />
            </div>
          ))}
          <div className={styles.sponsorAdd}>
            <button className={styles.logoAdd} type="button" aria-label={t.addLogo}>
              <Icon name="image" size={18} />
            </button>
            <Field label={t.organizationLabel}>
              <TextInput name="sponsor-name" placeholder={t.orgPlaceholder} autoComplete="off" />
            </Field>
            <Field label={t.linkLabel}>
              <TextInput
                name="sponsor-link"
                type="url"
                placeholder={t.urlPlaceholder}
                autoComplete="off"
              />
            </Field>
            <Field label={t.tierLabel}>
              <Select
                name="sponsor-tier"
                defaultValue="gold"
                aria-label={t.tierLabel}
                items={recordItems(t.tiers)}
              />
            </Field>
            <Button variant="secondary">
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
                name="license"
                defaultValue="bySa"
                aria-label={t.licenseLabel}
                items={licenseItems}
              />
            </Field>
            <Field label={t.copyrightHolder}>
              <TextInput name="copyright-holder" defaultValue="Alok Singh" autoComplete="off" />
            </Field>
            <Field label={t.yearLabel}>
              <TextInput
                name="copyright-year"
                defaultValue="2026"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
            <Callout icon="details" className={styles.spanAll}>
              <strong>{t.licenseCalloutStrong}</strong>
              <br />
              {t.licenseCalloutBody}
            </Callout>
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
            <Button variant="ghost">{messages.common.reveal}</Button>
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>{t.versionControl}</span>
              <span className={styles.settingDetail}>{t.gitDetail}</span>
            </span>
            <Status>{t.clean}</Status>
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>{t.contentRecords}</span>
              <span className={styles.settingDetail}>
                {t.recordSummary(
                  course.records.filter(
                    (record) => record.collectionId === (course.collections[0]?.id ?? ""),
                  ).length,
                  course.collections[0]?.name ?? t.noCollections,
                )}{" "}
                · {t.mediaFiles(course.assets.length)}
              </span>
            </span>
            <Button variant="ghost">{t.openContent}</Button>
          </div>
        </SectionGroup>
      </div>
    </WorkInner>
  );
}
