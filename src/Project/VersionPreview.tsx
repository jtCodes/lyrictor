import { useEffect, useState } from "react";
import type { Project } from "./types";
import { isDesktopApp } from "../platform";
import LyrictorLoadingIndicator from "../components/LyrictorLoadingIndicator";

/** The existing player runs in its own frame so inspection cannot replace the editor's stores. */
export default function VersionPreview({ project, label }: { project: Project; label: string }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    const key = `lyrictor-version-preview:${crypto.randomUUID()}`;
    setSrc(""); setError(false);
    try {
      sessionStorage.setItem(key, JSON.stringify(project));
      const route = `/lyrictor/local?versionPreview=${encodeURIComponent(key)}`;
      setSrc(isDesktopApp ? `${window.location.href.split("#")[0]}#${route}` : route);
    } catch { setError(true); }
    return () => { sessionStorage.removeItem(key); };
  }, [project]);
  if (error) return <p role="alert">Preview could not be opened. Browser session storage may be full.</p>;
  return src ? <iframe key={src} className="version-player" src={src} title={`Preview: ${label}`} allow="autoplay; fullscreen" /> : <LyrictorLoadingIndicator label="Loading preview" />;
}
