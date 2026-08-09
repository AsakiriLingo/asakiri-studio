import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@app/App";
import "@app/styles/global.css";

// Tauri v2 injects this global into the webview. Flag it so runtime-specific
// chrome (like the border under the native title bar) applies only in the app.
if ("__TAURI_INTERNALS__" in window) {
  document.documentElement.dataset.runtime = "tauri";
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
