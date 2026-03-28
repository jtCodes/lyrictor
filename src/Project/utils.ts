/** Returns the route path for viewing a published project. */
export function publishedProjectPath(id: string): string {
  return `/lyrictor/${id}`;
}

/** Returns the route path for viewing a local unpublished project preview. */
export function localPreviewProjectPath(): string {
  return "/lyrictor/local";
}

/**
 * Validates that a string is a well-formed http(s) URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
