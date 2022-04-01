import { LyricText } from "./Editor/types";
export interface Project {
  name: string;
  createdDate: Date;
  audioFileName: string;
  audioFileUrl: string;
  lyricTexts: LyricText[];
}
