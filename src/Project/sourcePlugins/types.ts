import { ProjectDetail } from "../types";

export interface ProjectSourceTagAppearance {
  background: string;
  borderColor: string;
  color: string;
  boxShadow?: string;
}

export interface ProjectSourcePlugin {
  id: string;
  tagLabel?: string;
  tagAppearance?: ProjectSourceTagAppearance;
  matchesUrl: (url: string) => boolean;
  matchesProject: (projectDetail: ProjectDetail) => boolean;
  clearProjectMetadata?: (projectDetail: ProjectDetail) => ProjectDetail;
  getCachedProjectDetail?: (projectDetail: ProjectDetail) => ProjectDetail | undefined;
  clearPersistedCache?: (projectDetail: ProjectDetail) => void;
  getPlaybackUrl?: (projectDetail: ProjectDetail) => string | undefined;
  getSourceUrl?: (projectDetail: ProjectDetail) => string | undefined;
  getLoadingMessage: (projectDetail: ProjectDetail) => string;
  checkingMessage?: string;
  resolvingMessage: string;
  resolveProjectDetail: (projectDetail: ProjectDetail) => Promise<ProjectDetail>;
}