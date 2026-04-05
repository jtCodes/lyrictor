import { useEffect } from "react";

const APP_NAME = "Lyrictor";

export function formatDocumentTitle(title?: string | null) {
  if (!title || title === APP_NAME) {
    return APP_NAME;
  }

  return `${title} | ${APP_NAME}`;
}

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = formatDocumentTitle(title);
  }, [title]);
}