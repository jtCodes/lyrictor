import { useEffect, useState } from "react";
import { SUPPORTED_FONT_FAMILIES, SUPPORTED_FONT_WEIGHTS } from "./supportedFonts";

const fontLoadPromiseCache = new Map<string, Promise<void>>();
const SUPPORTED_FONT_PRELOAD_SIZE = 32;

let supportedFontsReadyPromise: Promise<void> | null = null;

function quoteFontFamily(fontFamily: string) {
  return fontFamily
    .split(",")
    .map((family) => {
      const trimmedFamily = family.trim();

      if (!trimmedFamily) {
        return trimmedFamily;
      }

      if (trimmedFamily.startsWith("\"") || trimmedFamily.startsWith("'")) {
        return trimmedFamily;
      }

      return /\s/.test(trimmedFamily) ? `"${trimmedFamily}"` : trimmedFamily;
    })
    .join(", ");
}

export function getFontLoadSpec(fontFamily: string, fontWeight: number | string, fontSize: number) {
  return `${fontWeight} ${Math.max(1, Math.round(fontSize))}px ${quoteFontFamily(fontFamily)}`;
}

export function ensureFontReady(
  fontFamily: string,
  fontWeight: number | string,
  fontSize: number
) {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return Promise.resolve();
  }

  const fontSpec = getFontLoadSpec(fontFamily, fontWeight, fontSize);

  if (document.fonts.check(fontSpec)) {
    return Promise.resolve();
  }

  const cachedPromise = fontLoadPromiseCache.get(fontSpec);

  if (cachedPromise) {
    return cachedPromise;
  }

  const nextPromise = document.fonts
    .load(fontSpec)
    .then(() => document.fonts.ready)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      fontLoadPromiseCache.delete(fontSpec);
    });

  fontLoadPromiseCache.set(fontSpec, nextPromise);

  return nextPromise;
}

export function preloadSupportedFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return Promise.resolve();
  }

  if (supportedFontsReadyPromise) {
    return supportedFontsReadyPromise;
  }

  supportedFontsReadyPromise = Promise.all(
    SUPPORTED_FONT_FAMILIES.flatMap((fontFamily) =>
      SUPPORTED_FONT_WEIGHTS.map((fontWeight) =>
        ensureFontReady(fontFamily, fontWeight, SUPPORTED_FONT_PRELOAD_SIZE)
      )
    )
  )
    .then(() => document.fonts.ready)
    .then(() => undefined)
    .catch(() => undefined);

  return supportedFontsReadyPromise;
}

export function useSupportedFontsReady() {
  const [fontsReady, setFontsReady] = useState(
    () => typeof document === "undefined" || !("fonts" in document)
  );

  useEffect(() => {
    if (fontsReady) {
      return;
    }

    let disposed = false;

    preloadSupportedFonts().then(() => {
      if (!disposed) {
        setFontsReady(true);
      }
    });

    return () => {
      disposed = true;
    };
  }, [fontsReady]);

  return fontsReady;
}