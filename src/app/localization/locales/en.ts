import type { AppMessages } from "@app/localization/messages";

export const enMessages = {
  themeToggle: {
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
  },
  projectHub: {
    title: "Your courses live on your computer.",
    introduction:
      "Open a course repository to start editing. Content and media remain project-scoped, portable, and under your control.",
    openProjectTitle: "Open a project",
    openProjectDescription: "Choose the folder that contains one course repository.",
    chooseFolder: "Choose folder",
    openingFolder: "Opening…",
    dialogTitle: "Open course project",
    unsupported: "Local folders require a current Chromium browser or the desktop app.",
    errors: {
      permissionDenied: "Folder permission was denied.",
      unknown: "The project could not be opened.",
      unsupported: "This browser cannot access local project folders.",
    },
    ready: "Ready",
  },
  workspace: {
    navigationLabel: "Project workspace",
    backToProjects: "Back to projects",
    areas: {
      content: "Content",
      media: "Media",
    },
    emptyStates: {
      content: {
        title: "Content",
        description: "Reusable project content will appear here.",
      },
      media: {
        title: "Media",
        description: "Project audio, images, and video will appear here.",
      },
    },
  },
} satisfies AppMessages;
