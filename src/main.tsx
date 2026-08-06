import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@app/App";
import { AppProviders } from "@app/providers/AppProviders";
import { createAppDependencies } from "@app/providers/create-app-dependencies";
import "@app/styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

const dependencies = createAppDependencies();

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders dependencies={dependencies}>
      <App />
    </AppProviders>
  </StrictMode>,
);
