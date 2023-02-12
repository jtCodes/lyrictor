import { GeneratedImage, PromptParams } from './../Editor/Lyrics/Image/types';
import { LyricText } from "../Editor/types";
import { DataSource } from './CreateNewProjectForm';

export interface ProjectDetail {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
  dataSource: DataSource
}

export interface Project {
  id: string;
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: any;
  generatedImageLog: GeneratedImage[];
  promptLog: PromptParams[]
}
