import { useEffect, useMemo, useState } from "react";

const IMAGE_PRELOAD_TIMEOUT_MS = 8000;

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finalize = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve();
    };

    const finalizeAfterDecode = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => {}).finally(() => {
          requestAnimationFrame(() => {
            finalize();
          });
        });
        return;
      }

      requestAnimationFrame(() => {
        finalize();
      });
    };

    const timeoutId = window.setTimeout(finalize, IMAGE_PRELOAD_TIMEOUT_MS);

    image.onload = finalizeAfterDecode;
    image.onerror = finalize;
    image.decoding = "async";
    image.src = url;

    if (image.complete) {
      finalizeAfterDecode();
    }
  });
}

export function useImagePreload(urls: string[]) {
  const normalizedUrls = useMemo(
    () => Array.from(new Set(urls.filter((url) => Boolean(url)))),
    [urls]
  );
  const urlsKey = useMemo(() => normalizedUrls.join("\n"), [normalizedUrls]);
  const [loadedUrlsKey, setLoadedUrlsKey] = useState(urlsKey);
  const ready = urlsKey === loadedUrlsKey;

  useEffect(() => {
    let cancelled = false;

    if (normalizedUrls.length === 0) {
      setLoadedUrlsKey(urlsKey);
      return;
    }

    Promise.all(normalizedUrls.map((url) => preloadImage(url))).then(() => {
      if (!cancelled) {
        setLoadedUrlsKey(urlsKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedUrls, urlsKey]);

  return {
    imagesReady: ready,
    pendingImageCount: ready ? 0 : normalizedUrls.length,
  };
}