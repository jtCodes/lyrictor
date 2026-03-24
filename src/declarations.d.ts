interface Window {
  webkitAudioContext: typeof AudioContext;
  lyrictorDesktop?: {
    isDesktop: boolean;
    openExternal: (url: string) => Promise<void>;
    fetchArrayBuffer: (url: string) => Promise<ArrayBuffer>;
    cachedFileExists: (filePath: string) => Promise<boolean>;
    signInWithGoogle: (
      clientId: string,
      clientSecret?: string
    ) => Promise<{ idToken: string }>;
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

declare const __LYRICTOR_DESKTOP_GOOGLE_CLIENT_SECRET__: string;

declare module "*.css";
