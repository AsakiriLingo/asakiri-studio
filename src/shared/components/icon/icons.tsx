import type { ReactNode } from "react";

export type IconName =
  "plus" | "arrow-left" | "book" | "folder" | "upload" | "image" | "teacher" | "moon" | "sun";

export const icons: Readonly<Record<IconName, ReactNode>> = {
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M20 12H4" />
      <path d="M10.5 5.5L4 12l6.5 6.5" />
    </>
  ),
  book: (
    <>
      <path d="M5 19.5A2.5 2.5 0 017.5 17H19.5V3.5H7.5A2.5 2.5 0 005 6v13.5z" />
      <path d="M5 19.5A2.5 2.5 0 007.5 22H19.5v-5" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 7.5V6.75A2.25 2.25 0 015.75 4.5h4.1l2.1 2.25h6.3a2.25 2.25 0 012.25 2.25v8.25a2.25 2.25 0 01-2.25 2.25H5.75a2.25 2.25 0 01-2.25-2.25V7.5z" />
      <path d="M3.5 8.25h17" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7 8.5l5-5 5 5" />
      <path d="M4.5 20h15" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M4 16.5l4-3.5 4.5 4 3-2.5 4.5 3.5" />
    </>
  ),
  teacher: (
    <>
      <circle cx="9.4" cy="9.2" r="3.6" />
      <circle cx="8.15" cy="9.1" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="10.65" cy="9.1" r="1.05" fill="currentColor" stroke="none" />
      <path d="M3 20.5v-1a6.4 6.4 0 0112.8 0v1" />
      <rect x="14.8" y="7.6" width="7" height="6.4" rx="1.2" />
      <path d="M16.4 10h3.8M16.4 12h2.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 119.5 4 7 7 0 0020 14.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2.2" />
      <path d="M12 18.8V21" />
      <path d="M3 12h2.2" />
      <path d="M18.8 12H21" />
      <path d="M5.6 5.6l1.6 1.6" />
      <path d="M16.8 16.8l1.6 1.6" />
      <path d="M18.4 5.6l-1.6 1.6" />
      <path d="M7.2 16.8l-1.6 1.6" />
    </>
  ),
};
