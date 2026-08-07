import { useState } from "react";
import type { ProjectDirectory } from "@core/projects";
import { ProjectHubPage } from "@features/project-hub";
import { WorkspacePage } from "@features/workspace";
import { useLocalization } from "@app/localization/use-localization";
import { useAppDependencies } from "@app/providers/use-app-dependencies";
import { ThemeToggle } from "@app/theme/ThemeToggle";

export function App() {
  const { projectDirectoryGateway } = useAppDependencies();
  const { messages } = useLocalization();
  const [project, setProject] = useState<ProjectDirectory | null>(null);

  const headerActions = <ThemeToggle messages={messages.themeToggle} />;

  if (project) {
    return (
      <WorkspacePage
        messages={messages.workspace}
        onBack={() => {
          setProject(null);
        }}
        projectName={project.name}
        workspaceActions={headerActions}
      />
    );
  }

  return (
    <ProjectHubPage
      directoryGateway={projectDirectoryGateway}
      headerActions={headerActions}
      messages={messages.projectHub}
      onProjectOpened={setProject}
    />
  );
}
