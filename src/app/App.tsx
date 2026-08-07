import { useState } from "react";
import { createProjectSession, type ProjectSession } from "@core/projects";
import { ContentCollectionList } from "@features/content";
import { ProjectHubPage } from "@features/project-hub";
import { WorkspaceOpen } from "@features/workspace";
import { useLocalization } from "@app/localization/use-localization";
import { useAppDependencies } from "@app/providers/use-app-dependencies";
import { ThemeToggle } from "@app/theme/ThemeToggle";

export function App() {
  const { projectCreationGateway, projectDirectoryGateway, projectReader } = useAppDependencies();
  const { messages } = useLocalization();
  const [session, setSession] = useState<ProjectSession | null>(null);

  const headerActions = <ThemeToggle messages={messages.themeToggle} />;

  if (session) {
    return (
      <WorkspaceOpen
        key={session.id}
        messages={messages.workspace}
        onBack={() => {
          setSession(null);
        }}
        reader={projectReader}
        renderContent={(collections) => (
          <ContentCollectionList collections={collections} messages={messages.content} />
        )}
        session={session}
        workspaceActions={headerActions}
      />
    );
  }

  return (
    <ProjectHubPage
      creationGateway={projectCreationGateway}
      directoryGateway={projectDirectoryGateway}
      headerActions={headerActions}
      messages={messages.projectHub}
      onProjectOpened={(directory) => {
        setSession(createProjectSession(directory));
      }}
    />
  );
}
