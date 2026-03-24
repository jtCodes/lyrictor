interface Window {
  webkitAudioContext: typeof AudioContext;
  lyrictorDesktop?: {
    isDesktop: boolean;
    openExternal: (url: string) => Promise<void>;
  };
}

declare module "*.css";
