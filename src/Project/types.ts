import { LyricText } from "../Editor/types";

export interface ProjectDetail {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
}

export interface Project {
  id: string,
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: string
}
