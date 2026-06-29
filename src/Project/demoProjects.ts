import demoProjects from "../../demo_projects.json";
import { Project } from "./types";

export function getDemoProjects(): Project[] {
  return demoProjects as unknown as Project[];
}

export function getDemoProject(projectId: string): Project | undefined {
  return getDemoProjects().find((project) => project.id === projectId);
}
