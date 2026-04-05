function slugifySeoValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || undefined;
}

export function buildPublishedProjectSeoLabel({
  songName,
  artistName,
  projectName,
}: {
  songName?: string;
  artistName?: string;
  projectName?: string;
}): string {
  if (songName && artistName) {
    return `${songName} by ${artistName} lyric video`;
  }

  if (songName) {
    return `${songName} lyric video`;
  }

  if (artistName) {
    return `${artistName} lyric video`;
  }

  return projectName || "Published lyric video";
}

/** Returns the route path for viewing a published project. */
export function publishedProjectPath(
  id: string,
  options?: {
    artistName?: string;
    songName?: string;
  }
): string {
  const query = new URLSearchParams();
  const artistSlug = slugifySeoValue(options?.artistName);
  const songSlug = slugifySeoValue(options?.songName);

  if (artistSlug) {
    query.set("artist", artistSlug);
  }

  if (songSlug) {
    query.set("song", songSlug);
  }

  const queryString = query.toString();
  return queryString ? `/lyrictor/${id}?${queryString}` : `/lyrictor/${id}`;
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
