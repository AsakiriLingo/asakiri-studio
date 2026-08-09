import type { ReactNode } from "react";

export type IconName =
  | "plus"
  | "arrow-left"
  | "arrow"
  | "chevron-down"
  | "check"
  | "back"
  | "book"
  | "folder"
  | "upload"
  | "image"
  | "teacher"
  | "moon"
  | "sun"
  | "integrations"
  | "grip"
  | "details"
  | "content"
  | "media"
  | "lessons"
  | "list"
  | "heading"
  | "bold"
  | "sparkles"
  | "external"
  | "trash"
  | "heart"
  | "mic"
  | "audio"
  | "video";

export const icons: Readonly<Record<IconName, ReactNode>> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  back: (
    <>
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </>
  ),
  grip: (
    <>
      <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />
    </>
  ),
  details: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  content: (
    <>
      <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
    </>
  ),
  media: (
    <>
      <path d="M4 6h16v12H4z" />
      <path d="m4 16 5-5 4 4 2-2 5 5" />
    </>
  ),
  lessons: (
    <>
      <path d="M5 4h14v16H5zM8 8h8M8 12h6" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  heading: <path d="M5 5v14M19 5v14M5 12h14" />,
  bold: <path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z" />,
  sparkles: (
    <>
      <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6z" />
      <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z" />
    </>
  ),
  external: (
    <>
      <path d="M15 4h5v5" />
      <path d="M20 4 11 13" />
      <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 4h4" />
      <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
    </>
  ),
  heart: (
    <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21.5l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1z" />
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </>
  ),
  audio: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="m17 10 4-2v8l-4-2z" />
    </>
  ),
  integrations: (
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.2 5.3a4 4 0 0 1 5.7 5.7l-1.2 1.2" />
      <path d="M13 17.5 11.8 18.7a4 4 0 0 1-5.7-5.7l1.2-1.2" />
    </>
  ),
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
