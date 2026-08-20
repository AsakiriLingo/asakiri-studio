import type { CourseProject } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

export interface ProjectActions {
  readonly saveProject: (
    update: (current: CourseProject) => CourseProject,
  ) => Promise<ProjectWriteResult>;
  readonly saveAttribution: (markdown: string) => Promise<ProjectWriteResult>;
}

export function useProjectActions(services: AppServices, store: CourseStateStore): ProjectActions {
  const saveProject = (
    update: (current: CourseProject) => CourseProject,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const nextProject = update(course.project);
      const result = await services.writer.updateProject(session, nextProject);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, project: nextProject },
        }));
      }
      return result;
    });

  const saveAttribution = (markdown: string): Promise<ProjectWriteResult> =>
    store.withProject(WRITE_UNAVAILABLE, (session) =>
      services.writer.writeAttribution(session, markdown),
    );

  return { saveProject, saveAttribution };
}
