import type { AppMessages } from "@app/localization/messages";

export const enMessages = {
  projectHub: {
    navigationLabel: "Studio",
    homeLabel: "Asakiri Studio home",
    productName: "Asakiri Studio",
    runtime: {
      browser: "Chromium",
      desktop: "Desktop",
    },
    eyebrow: "Local-first course editor",
    title: "Your courses live on your computer.",
    introduction:
      "Open a course repository to start editing. Content and media remain project-scoped, portable, and under your control.",
    openProjectTitle: "Open a project",
    openProjectDescription: "Choose the folder that contains one course repository.",
    chooseFolder: "Choose folder",
    openingFolder: "Opening…",
    dialogTitle: "Open course project",
    unsupported:
      "Local folders require a current Chromium browser or the desktop app.",
    errors: {
      permissionDenied: "Folder permission was denied.",
      unknown: "The project could not be opened.",
      unsupported: "This browser cannot access local project folders.",
    },
    ready: "Ready",
  },
} satisfies AppMessages;
