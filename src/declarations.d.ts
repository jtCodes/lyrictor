interface Window {
  webkitAudioContext: typeof AudioContext;
  lyrictorDesktop?: {
    isDesktop: boolean;
    openExternal: (url: string) => Promise<void>;
    signInWithGoogle: (clientId: string) => Promise<{ idToken: string }>;
  };
}

declare module "*.css";
