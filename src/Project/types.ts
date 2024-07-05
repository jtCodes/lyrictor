import { GeneratedImage, PromptParams } from "../Editor/Image/types";
import { LyricText } from "../Editor/types";

export enum VideoResolution {
  "16/9" = "16/9",
  "9/16" = "9/16",
}

export interface ProjectDetail {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
  isLocalUrl: boolean;
  resolution?: VideoResolution;
  albumArtSrc?: string
}

export interface Project {
  id: string;
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: any;
  generatedImageLog: GeneratedImage[];
  promptLog: PromptParams[];
}
