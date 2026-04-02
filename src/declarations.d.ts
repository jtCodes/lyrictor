interface Window {
  webkitAudioContext: typeof AudioContext;
  lyrictorDesktop?: {
    isDesktop: boolean;
    getAppInfo: () => Promise<{
      arch: string;
      isPackaged: boolean;
      platform: string;
      version: string;
    }>;
    openExternal: (url: string) => Promise<void>;
    fetchArrayBuffer: (url: string) => Promise<ArrayBuffer>;
    cachedFileExists: (filePath: string) => Promise<boolean>;
    getYouTubeCacheDirectory: () => Promise<string>;
    openYouTubeCacheDirectory: () => Promise<string>;
    signInWithGoogle: (authBaseUrl: string) => Promise<{ idToken: string }>;
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
declare module "@fontsource-variable/*";
