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
  artistName?: string;
  songName?: string;
  createdDate: Date;
  updatedDate?: Date;
  audioFileName: string;
  audioFileUrl: string;
  appleMusicAlbumUrl?: string;
  appleMusicTrackId?: string;
  appleMusicTrackName?: string;
  isLocalUrl: boolean;
  resolution?: VideoAspectRatio;
  albumArtSrc?: string;
  editingMode: EditingMode;
}

export type ProjectSource = "cloud" | "local" | "demo";

export interface Project {
  id: string;
  projectDetail: ProjectDetail;
  lyricTexts: LyricText[];
  lyricReference?: any;
  generatedImageLog: GeneratedImage[];
  promptLog: PromptParams[];
  images: ImageItem[];
  source?: ProjectSource;
}
