import type { ReactNode } from "react";
import { Button } from "@shared/components/button";
import { Callout } from "@shared/components/callout";
import { Field, TextArea, TextInput } from "@shared/components/form";
import { Select } from "@shared/components/select";
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

function toItems(labels: readonly string[]) {
  return labels.map((label) => ({ value: label, label }));
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
  return (
    <span className={styles.inlineActions}>
      <Button variant="ghost">Edit</Button>
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

export function CourseDetails() {
  return (
    <WorkInner>
      <WorkHeader
        title="Course details"
        description="The course-level metadata learners see first. Everything here is saved to this project folder."
        actions={<Status>Saved locally</Status>}
      />

      <div className={styles.settingsStack}>
        <SectionGroup
          title="Overview"
          titleId="overview-title"
          description="Shown on the course card and cover."
        >
          <div className={joinClassNames(styles.formGrid, styles.detailBody)}>
            <Field
              label="Course title"
              help="Separate from the folder name — you can rename it any time."
            >
              <TextInput name="title" defaultValue="Japanese Starter" autoComplete="off" />
            </Field>
            <Field label="Subtitle" help="One short line under the title.">
              <TextInput
                name="subtitle"
                defaultValue="Your first words and sentences"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Description"
              help="Markdown is supported. Appears on the course landing page."
            >
              <TextArea
                name="description"
                rows={3}
                defaultValue="A gentle introduction to Japanese. Meet everyday words in context, then practise them with images, matching, and short sentences."
              />
            </Field>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Language"
          titleId="language-title"
          description="Controls fonts, audio direction, and default reading aids."
        >
          <div className={joinClassNames(styles.formGrid, styles.two, styles.detailBody)}>
            <Field label="Language taught" help="The language learners are studying.">
              <TextInput name="target-language" defaultValue="Japanese" autoComplete="off" />
            </Field>
            <Field label="Explained in" help="The language used for instructions and meanings.">
              <TextInput name="source-language" defaultValue="English" autoComplete="off" />
            </Field>
            <Field label="Level" help="Shown as a badge on the course.">
              <Select
                name="level"
                defaultValue="a1"
                aria-label="Level"
                items={[
                  { value: "a1", label: "Beginner · A1" },
                  { value: "a2", label: "Elementary · A2" },
                  { value: "b1", label: "Intermediate · B1" },
                ]}
              />
            </Field>
            <Field label="Estimated length" help="A rough guide for learners browsing.">
              <TextInput name="length" defaultValue="2 units · 3 lessons" autoComplete="off" />
            </Field>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Cover image"
          titleId="cover-title"
          description="Pulled from project media or an image integration."
        >
          <div className={styles.detailBody}>
            <div className={styles.inlineActions}>
              <span className={styles.assetRef}>
                <Icon name="image" size={16} />
                cover-torii.jpg
              </span>
              <Button variant="secondary">Choose media</Button>
              <Button variant="ghost">Remove</Button>
            </div>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Contributors"
          titleId="contributors-title"
          description="Credited on the course page. Add a link for each person."
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
                    Add link
                  </button>
                </span>
              </span>
              <RowActions removeLabel={`Remove ${person.name}`} />
            </div>
          ))}
          <div className={styles.contributorAdd}>
            <button className={styles.avatarAdd} type="button" aria-label="Add photo">
              <Icon name="image" size={18} />
            </button>
            <Field label="Role">
              <Select
                name="contributor-role"
                defaultValue="Author"
                aria-label="Role"
                items={toItems([
                  "Author",
                  "Co-author",
                  "Translator",
                  "Voice",
                  "Illustrator",
                  "Editor",
                  "Reviewer",
                  "Contributor",
                ])}
              />
            </Field>
            <Field label="Name">
              <TextInput name="contributor-name" placeholder="Full name" autoComplete="off" />
            </Field>
            <Field label="Link">
              <TextInput
                name="contributor-link"
                type="url"
                placeholder="https://…"
                autoComplete="off"
              />
            </Field>
            <Button variant="secondary">
              <Icon name="plus" size={18} />
              Add
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Funding & support"
          titleId="funding-title"
          description="Support links for the authors, shown on the course page."
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
              <RowActions removeLabel={`Remove ${entry.name}`} />
            </div>
          ))}
          <div className={styles.fundingAdd}>
            <Field label="Platform">
              <Select
                name="funding-platform"
                defaultValue="GitHub Sponsors"
                aria-label="Platform"
                items={toItems([
                  "GitHub Sponsors",
                  "Ko-fi",
                  "Patreon",
                  "Open Collective",
                  "Buy Me a Coffee",
                  "Liberapay",
                  "PayPal",
                  "Custom URL",
                ])}
              />
            </Field>
            <Field label="Link">
              <TextInput
                name="funding-link"
                type="url"
                placeholder="https://…"
                autoComplete="off"
              />
            </Field>
            <Button variant="secondary">
              <Icon name="plus" size={18} />
              Add
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Sponsors"
          titleId="sponsors-title"
          description="Organizations that backed this course, credited with a logo."
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
              <RowActions removeLabel={`Remove ${sponsor.name}`} />
            </div>
          ))}
          <div className={styles.sponsorAdd}>
            <button className={styles.logoAdd} type="button" aria-label="Add logo">
              <Icon name="image" size={18} />
            </button>
            <Field label="Organization">
              <TextInput name="sponsor-name" placeholder="Name" autoComplete="off" />
            </Field>
            <Field label="Link">
              <TextInput
                name="sponsor-link"
                type="url"
                placeholder="https://…"
                autoComplete="off"
              />
            </Field>
            <Field label="Tier">
              <Select
                name="sponsor-tier"
                defaultValue="Gold"
                aria-label="Tier"
                items={toItems(["Gold", "Silver", "Bronze", "Supporter"])}
              />
            </Field>
            <Button variant="secondary">
              <Icon name="plus" size={18} />
              Add
            </Button>
          </div>
        </SectionGroup>

        <SectionGroup
          title="License"
          titleId="license-title"
          description="How others may reuse this course and its content."
        >
          <div className={joinClassNames(styles.formGrid, styles.two, styles.detailBody)}>
            <Field
              label="License"
              className={styles.spanAll}
              help="Applies to the course text and structure. Media may carry its own license."
            >
              <Select
                name="license"
                defaultValue="by-sa"
                aria-label="License"
                items={[
                  { value: "by", label: "CC BY 4.0 · Attribution" },
                  { value: "by-sa", label: "CC BY-SA 4.0 · Attribution-ShareAlike" },
                  { value: "by-nc", label: "CC BY-NC 4.0 · Attribution-NonCommercial" },
                  {
                    value: "by-nc-sa",
                    label: "CC BY-NC-SA 4.0 · Attribution-NonCommercial-ShareAlike",
                  },
                  { value: "cc0", label: "CC0 1.0 · Public domain" },
                  { value: "arr", label: "All rights reserved" },
                ]}
              />
            </Field>
            <Field label="Copyright holder">
              <TextInput name="copyright-holder" defaultValue="Alok Singh" autoComplete="off" />
            </Field>
            <Field label="Year">
              <TextInput
                name="copyright-year"
                defaultValue="2026"
                inputMode="numeric"
                autoComplete="off"
              />
            </Field>
            <Callout icon="details" className={styles.spanAll}>
              <strong>CC BY-SA 4.0.</strong>
              <br />
              Learners and other authors may share and adapt the course, even commercially, as long
              as they credit the contributors above and release their version under the same
              license.
            </Callout>
          </div>
        </SectionGroup>

        <SectionGroup
          title="Project"
          titleId="project-title"
          description="Where and how this course is stored."
        >
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>Folder</span>
              <span className={joinClassNames(styles.settingDetail, styles.mono)}>
                ~/Courses/Japanese Starter
              </span>
            </span>
            <Button variant="ghost">Reveal</Button>
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>Version control</span>
              <span className={styles.settingDetail}>Git initialized · 12 commits</span>
            </span>
            <Status>Clean</Status>
          </div>
          <div className={styles.settingRow}>
            <span>
              <span className={styles.settingName}>Content records</span>
              <span className={styles.settingDetail}>6 in Vocabulary · 3 media files</span>
            </span>
            <Button variant="ghost">Open content</Button>
          </div>
        </SectionGroup>
      </div>
    </WorkInner>
  );
}
