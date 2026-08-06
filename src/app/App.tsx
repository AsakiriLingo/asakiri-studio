import { ProjectHubPage } from "@features/project-hub";
import { useLocalization } from "@app/localization/use-localization";
import { useAppDependencies } from "@app/providers/use-app-dependencies";

export function App() {
  const { projectDirectoryGateway } = useAppDependencies();
  const { messages } = useLocalization();

  return (
    <ProjectHubPage
      directoryGateway={projectDirectoryGateway}
      messages={messages.projectHub}
    />
  );
}
