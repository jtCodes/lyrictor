const LRCLIB_API_BASE_URL = "https://lrclib.net/api";

export interface LRCLIBLyricsRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string | null;
}

export interface LRCLIBTrackSignature {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
}

export interface LRCLIBSearchParams {
  q?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
}

export interface LRCLIBSyncedLyricLine {
  time: number;
  text: string;
}

function buildLRCLIBUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(path, `${LRCLIB_API_BASE_URL}/`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseLRCLIBError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === "string" && data.message.length > 0) {
      return data.message;
    }
  } catch {
    // Ignore JSON parsing errors and fall back to plain text.
  }

  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
}

async function fetchLRCLIB<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorMessage = await parseLRCLIBError(response);
    throw new Error(`LRCLIB API error ${response.status}: ${errorMessage}`);
  }

  return response.json();
}

export async function getLRCLIBLyrics(
  signature: LRCLIBTrackSignature,
  options?: { cachedOnly?: boolean }
): Promise<LRCLIBLyricsRecord> {
  const endpoint = options?.cachedOnly ? "get-cached" : "get";

  return fetchLRCLIB<LRCLIBLyricsRecord>(
    buildLRCLIBUrl(endpoint, {
      track_name: signature.trackName,
      artist_name: signature.artistName,
      album_name: signature.albumName,
      duration: Math.round(signature.duration),
    })
  );
}

export async function getLRCLIBLyricsById(
  id: number
): Promise<LRCLIBLyricsRecord> {
  return fetchLRCLIB<LRCLIBLyricsRecord>(buildLRCLIBUrl(`get/${id}`));
}

export async function searchLRCLIBLyrics(
  params: LRCLIBSearchParams
): Promise<LRCLIBLyricsRecord[]> {
  if (!params.q && !params.trackName) {
    throw new Error("LRCLIB search requires either q or trackName");
  }

  return fetchLRCLIB<LRCLIBLyricsRecord[]>(
    buildLRCLIBUrl("search", {
      q: params.q,
      track_name: params.trackName,
      artist_name: params.artistName,
      album_name: params.albumName,
    })
  );
}

export function hasLRCLIBSyncedLyrics(record: LRCLIBLyricsRecord): boolean {
  return typeof record.syncedLyrics === "string" && record.syncedLyrics.trim().length > 0;
}

export function parseLRCLIBTimestamp(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);

  if (!match) {
    throw new Error(`Invalid LRCLIB timestamp: ${value}`);
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ?? "0";
  const milliseconds = Number(fraction.padEnd(3, "0"));

  return minutes * 60 + seconds + milliseconds / 1000;
}

export function parseLRCLIBSyncedLyrics(
  syncedLyrics: string | null | undefined
): LRCLIBSyncedLyricLine[] {
  if (!syncedLyrics) {
    return [];
  }

  const parsedLines: LRCLIBSyncedLyricLine[] = [];
  const rows = syncedLyrics.split(/\r?\n/);

  for (const row of rows) {
    const timestampMatches = Array.from(row.matchAll(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g));

    if (timestampMatches.length === 0) {
      continue;
    }

    const text = row.replace(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g, "").trim();

    for (const match of timestampMatches) {
      parsedLines.push({
        time: parseLRCLIBTimestamp(match[1]),
        text,
      });
    }
  }

  return parsedLines.sort((left, right) => left.time - right.time);
}