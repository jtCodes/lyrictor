import { GeneratedImage, PromptParams } from "../Editor/Image/AI/types";
import { ImageItem } from "../Editor/Image/Imported/ImportImageButton";
import { LyricText } from "../Editor/types";
import { LRCLIBLyricsRecord } from "../api/lrclib";
import { BrowserInfo } from "./browserInfo";

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
  lrclib?: LRCLIBLyricsRecord | null;
  lrclibOffsetSeconds?: number;
  createdDate: Date;
  updatedDate?: Date;
  audioFileName: string;
  audioFileUrl: string;
  playbackAudioFileUrl?: string;
  localAudioFilePath?: string;
  appleMusicAlbumUrl?: string;
  appleMusicTrackId?: string;
  appleMusicTrackName?: string;
  youtubeSourceUrl?: string;
  youtubeVideoId?: string;
  youtubeDurationSeconds?: number;
  cachedAudioFilePath?: string;
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
  savedBrowserInfo?: BrowserInfo;
  publishedBrowserInfo?: BrowserInfo;
  uid?: string;
  username?: string;
  publishedAt?: string;
  promptLog: PromptParams[];
  images: ImageItem[];
  source?: ProjectSource;
}
