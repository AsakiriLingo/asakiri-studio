import type { ProjectDirectoryGateway } from "@shared/contracts/project-directory";
import { Button } from "@shared/components/Button";
import { useProjectHub } from "@features/project-hub/hooks/use-project-hub";

interface ProjectHubPageProps {
  readonly directoryGateway: ProjectDirectoryGateway;
}

export function ProjectHubPage({ directoryGateway }: ProjectHubPageProps) {
  const { state, openProject } = useProjectHub(directoryGateway);
  const isOpening = state.status === "opening";

  return (
    <main className="project-hub">
      <nav className="project-hub__nav" aria-label="Studio">
        <a className="brand" href="/" aria-label="Asakiri Studio home">
          <span className="brand__mark" aria-hidden="true">A</span>
          <span>Asakiri Studio</span>
        </a>
        <span className="environment-pill">
          {"__TAURI_INTERNALS__" in window ? "Desktop" : "Chromium"}
        </span>
      </nav>

      <section className="project-hub__content" aria-labelledby="project-hub-title">
        <div className="eyebrow">Local-first course editor</div>
        <h1 id="project-hub-title">Your courses live on your computer.</h1>
        <p className="project-hub__intro">
          Open a course repository to start editing. Content and media remain
          project-scoped, portable, and under your control.
        </p>

        <div className="project-card">
          <div>
            <h2>Open a project</h2>
            <p>Choose the folder that contains one course repository.</p>
          </div>
          <Button
            type="button"
            onClick={() => void openProject()}
            disabled={!directoryGateway.isSupported || isOpening}
          >
            {isOpening ? "Opening…" : "Choose folder"}
          </Button>
        </div>

        {!directoryGateway.isSupported && (
          <p className="notice" role="status">
            Local folders require a current Chromium browser or the desktop app.
          </p>
        )}

        {state.status === "error" && (
          <p className="notice notice--error" role="alert">{state.message}</p>
        )}

        {state.status === "opened" && (
          <div className="opened-project" aria-live="polite">
            <span className="opened-project__icon" aria-hidden="true">✓</span>
            <div>
              <strong>{state.project.name}</strong>
              <span>{state.project.locationLabel}</span>
            </div>
            <span className="opened-project__status">Ready</span>
          </div>
        )}
      </section>
    </main>
  );
}
