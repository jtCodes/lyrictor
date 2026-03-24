interface Window {
  webkitAudioContext: typeof AudioContext;
  lyrictorDesktop?: {
    isDesktop: boolean;
    openExternal: (url: string) => Promise<void>;
    fetchArrayBuffer: (url: string) => Promise<ArrayBuffer>;
    cachedFileExists: (filePath: string) => Promise<boolean>;
    signInWithGoogle: (clientId: string) => Promise<{ idToken: string }>;
    resolveYouTubeAudio: (url: string) => Promise<{
      artistName?: string;
      audioFileUrl: string;
      cachedAudioFilePath: string;
      cacheDirectory: string;
      canonicalUrl: string;
      durationSeconds?: number;
      thumbnailUrl?: string;
      title: string;
      videoId?: string;
    }>;
  };
}

declare module "*.css";
