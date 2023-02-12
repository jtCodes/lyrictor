export interface YoutubeStreamUrlResp {
  videoDetails: VideoDetails;
  formats: Format[];
}

interface VideoDetails {
  videoId: string;
  title: string;
  lengthSeconds: string;
  keywords: string[];
  channelId: string;
  isOwnerViewing: boolean;
  shortDescription: string;
  isCrawlable: boolean;
  thumbnail: Thumbnail;
  allowRatings: boolean;
  viewCount: string;
  author: string;
  isPrivate: boolean;
  isUnpluggedCorpus: boolean;
  isLiveContent: boolean;
}

interface Thumbnail {
  thumbnails: Thumbnail2[];
}

interface Thumbnail2 {
  url: string;
  width: number;
  height: number;
}

interface Format {
  itag: number;
  mimeType: string;
  bitrate: number;
  width?: number;
  height?: number;
  lastModified: string;
  quality: string;
  fps?: number;
  qualityLabel?: string;
  projectionType: string;
  audioQuality?: string;
  approxDurationMs: string;
  audioSampleRate?: string;
  audioChannels?: number;
  url: string;
  initRange?: InitRange;
  indexRange?: IndexRange;
  contentLength?: string;
  averageBitrate?: number;
  highReplication?: boolean;
}

interface InitRange {
  start: string;
  end: string;
}

interface IndexRange {
  start: string;
  end: string;
}
