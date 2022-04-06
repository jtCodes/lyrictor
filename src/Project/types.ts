import { LyricText } from "../Editor/types";

export interface ProjectDetail {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
  isLocalUrl: boolean;
}

export interface Project {
  id: string;
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: any;
}
