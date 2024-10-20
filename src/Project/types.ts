import { GeneratedImage, PromptParams } from "../Editor/Image/AI/types";
import { ImageItem } from "../Editor/Image/Imported/ImportImageButton";
import { LyricText } from "../Editor/types";

export enum EditingMode {
  free = "free",
  static = "static",
}

export enum VideoAspectRatio {
  "16/9" = "16/9",
  "9/16" = "9/16",
}

export interface ProjectDetail {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
  isLocalUrl: boolean;
  resolution?: VideoAspectRatio;
  albumArtSrc?: string;
  editingMode: EditingMode;
}

export interface Project {
  id: string;
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: any;
  generatedImageLog: GeneratedImage[];
  promptLog: PromptParams[];
  images: ImageItem[];
}
