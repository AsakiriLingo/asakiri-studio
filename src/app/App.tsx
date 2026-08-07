import { useState } from "react";
import type { ContentCollectionSummary } from "@core/project-reading";
import { createProjectSession, type ProjectSession } from "@core/projects";
import { ContentCollectionList } from "@features/content";
import { ProjectHubPage } from "@features/project-hub";
import { WorkspaceOpen } from "@features/workspace";
import { useLocalization } from "@app/localization/use-localization";
import { useAppDependencies } from "@app/providers/use-app-dependencies";
import { ThemeToggle } from "@app/theme/ThemeToggle";

const exampleContentCollections: readonly ContentCollectionSummary[] = [
  { id: "vocabulary", name: "Vocabulary", recordCount: 3 },
  { id: "phrases", name: "Phrases", recordCount: 0 },
];

export function App() {
  const { projectDirectoryGateway } = useAppDependencies();
  const { messages } = useLocalization();
  const [session, setSession] = useState<ProjectSession | null>(null);

  const headerActions = <ThemeToggle messages={messages.themeToggle} />;

  if (session) {
    return (
      <WorkspaceOpen
        key={session.id}
        contentSlot={
          <ContentCollectionList
            collections={exampleContentCollections}
            messages={messages.content}
          />
        }
        messages={messages.workspace}
        onBack={() => {
          setSession(null);
        }}
        session={session}
        workspaceActions={headerActions}
      />
    );
  }

  return (
    <ProjectHubPage
      directoryGateway={projectDirectoryGateway}
      headerActions={headerActions}
      messages={messages.projectHub}
      onProjectOpened={(directory) => {
        setSession(createProjectSession(directory));
      }}
    />
  );
}
