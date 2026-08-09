import type { AppMessages } from "@app/localization/messages";

export const enMessages = {
  content: {
    collectionsLabel: "Content collections",
    recordCount: (count: number) => `${String(count)} ${count === 1 ? "record" : "records"}`,
    empty: {
      title: "No content yet",
      description: "Content collections in this project will appear here.",
    },
  },
  themeToggle: {
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
  },
  projectHub: {
    title: "Courses",
    introduction: "Open an existing course folder or create a new course on this computer.",
    startTitle: "Start",
    chooseFolder: "Open course",
    openingFolder: "Opening…",
    dialogTitle: "Open course project",
    errors: {
      permissionDenied: "Folder permission was denied.",
      unknown: "The project could not be opened.",
    },
    ready: "Ready",
    create: {
      title: "Create a course",
      description: "Start a new course. Studio makes the project folder and initializes Git.",
      openButton: "New course",
      nameLabel: "Course name",
      namePlaceholder: "e.g. Japanese Starter",
      createButton: "Create",
      cancelButton: "Cancel",
      creating: "Creating…",
      dialogTitle: "Choose where to save the course",
      errors: {
        alreadyExists: "A folder with that name already exists here.",
        invalidName: "Enter a valid course name.",
        permissionDenied: "Permission to write to that folder was denied.",
        unknown: "The course could not be created.",
      },
    },
  },
  workspace: {
    navigationLabel: "Project workspace",
    backToProjects: "Back to projects",
    areas: {
      content: "Content",
      media: "Media",
      lessons: "Lessons",
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
      lessons: {
        title: "Lessons",
        description: "Course lessons and their content will appear here.",
      },
    },
    contentActions: {
      createContent: "New content",
    },
    mediaActions: {
      importMedia: "Import media",
    },
    openStates: {
      validating: "Checking this project…",
      invalidTitle: "This project could not be opened.",
      invalidReasons: {
        unreadable:
          "This project's content could not be read. Return to your projects and open it again.",
        unknown:
          "Something went wrong while opening this project. Return to your projects and try again.",
      },
    },
  },
} satisfies AppMessages;
