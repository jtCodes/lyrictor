export interface AppleMusicAlbumTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl100?: string;
  trackNumber?: number;
  discNumber?: number;
}

export interface AppleMusicAlbumLookupResult {
  albumName: string;
  artistName: string;
  artworkUrl100?: string;
  tracks: AppleMusicAlbumTrack[];
}

export function parseAppleMusicSongUrl(input: string): {
  country: string;
  songId: string;
  originalUrl: string;
} | null {
  try {
    const url = new URL(input);

    if (!/(^|\.)music\.apple\.com$/i.test(url.hostname)) {
      return null;
    }

    const querySongId = url.searchParams.get("i");
    if (querySongId) {
      const countryMatch = url.pathname.match(/^\/([a-z]{2})\//i);
      return {
        country: (countryMatch?.[1] ?? "us").toLowerCase(),
        songId: querySongId,
        originalUrl: input,
      };
    }

    const match = url.pathname.match(/^\/([a-z]{2})\/song\/[^/]+\/(\d+)/i);
    if (!match) {
      return null;
    }

    return {
      country: match[1].toLowerCase(),
      songId: match[2],
      originalUrl: input,
    };
  } catch {
    return null;
  }
}

export function parseAppleMusicAlbumUrl(input: string): {
  country: string;
  albumId: string;
  originalUrl: string;
} | null {
  try {
    const url = new URL(input);

    if (!/(^|\.)music\.apple\.com$/i.test(url.hostname)) {
      return null;
    }

    const match = url.pathname.match(/^\/([a-z]{2})\/album\/[^/]+\/(\d+)/i);
    if (!match) {
      return null;
    }

    return {
      country: match[1].toLowerCase(),
      albumId: match[2],
      originalUrl: input,
    };
  } catch {
    return null;
  }
}

function jsonp<T>(url: string, callbackParam = "callback"): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__apple_jsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement("script");

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    function cleanup() {
      delete (window as any)[callbackName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error("Apple Music lookup failed"));
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}${callbackParam}=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function requestLookup(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Lookup failed: ${response.status}`);
    }

    return await response.json();
  } catch {
    return jsonp<any>(url);
  }
}

export async function resolveAppleMusicAlbumTracks(
  input: string
): Promise<AppleMusicAlbumLookupResult | null> {
  const parsed = parseAppleMusicAlbumUrl(input);
  if (!parsed) {
    return null;
  }

  const data = await requestLookup(
    `https://itunes.apple.com/lookup?id=${parsed.albumId}&entity=song&country=${parsed.country}`
  );

  const results = Array.isArray(data?.results) ? data.results : [];
  const collection = results.find((item: any) => item.wrapperType === "collection");

  const tracks = results
    .filter(
      (item: any) =>
        item.wrapperType === "track" &&
        item.kind === "song" &&
        typeof item.previewUrl === "string" &&
        item.previewUrl.length > 0
    )
    .map(
      (item: any): AppleMusicAlbumTrack => ({
        trackId: String(item.trackId),
        trackName: item.trackName,
        artistName: item.artistName,
        previewUrl: item.previewUrl,
        artworkUrl100: item.artworkUrl100,
        trackNumber: item.trackNumber,
        discNumber: item.discNumber,
      })
    )
    .sort((a: AppleMusicAlbumTrack, b: AppleMusicAlbumTrack) => {
      const discA = a.discNumber ?? 0;
      const discB = b.discNumber ?? 0;
      if (discA !== discB) return discA - discB;
      return (a.trackNumber ?? 0) - (b.trackNumber ?? 0);
    });

  return {
    albumName: collection?.collectionName ?? "Album",
    artistName: collection?.artistName ?? "",
    artworkUrl100: collection?.artworkUrl100,
    tracks,
  };
}

export async function resolveAppleMusicSongTrack(
  input: string
): Promise<AppleMusicAlbumTrack | null> {
  const parsed = parseAppleMusicSongUrl(input);
  if (!parsed) {
    return null;
  }

  const data = await requestLookup(
    `https://itunes.apple.com/lookup?id=${parsed.songId}&country=${parsed.country}`
  );

  const results = Array.isArray(data?.results) ? data.results : [];
  const track = results.find(
    (item: any) =>
      item.wrapperType === "track" &&
      item.kind === "song" &&
      typeof item.previewUrl === "string" &&
      item.previewUrl.length > 0
  );

  if (!track) {
    return null;
  }

  return {
    trackId: String(track.trackId),
    trackName: track.trackName,
    artistName: track.artistName,
    previewUrl: track.previewUrl,
    artworkUrl100: track.artworkUrl100,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
  };
}