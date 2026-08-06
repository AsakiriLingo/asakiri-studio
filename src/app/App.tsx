import { ProjectHubPage } from "@features/project-hub";
import { useAppDependencies } from "@app/providers/use-app-dependencies";

export function App() {
  const { projectDirectoryGateway } = useAppDependencies();

  return <ProjectHubPage directoryGateway={projectDirectoryGateway} />;
}
