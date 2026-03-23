import { useEffect, useMemo, useState } from "react";
import {
  getLRCLIBLyrics,
  hasLRCLIBSyncedLyrics,
  LRCLIBLyricsRecord,
  parseLRCLIBSyncedLyrics,
  searchLRCLIBLyrics,
} from "../../api/lrclib";
import { resolveAppleMusicAlbumTracks } from "../../Project/appleMusic";

export default function LRCLIBSyncModal({
  open,
  onClose,
  initialTrackName,
  initialArtistName,
  initialAlbumName,
  initialDuration,
  initialAudioUrl,
  initialAppleMusicAlbumUrl,
}: {
  open: boolean;
  onClose: () => void;
  initialTrackName?: string;
  initialArtistName?: string;
  initialAlbumName?: string;
  initialDuration?: number;
  initialAudioUrl?: string;
  initialAppleMusicAlbumUrl?: string;
}) {
  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<LRCLIBLyricsRecord | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTrackName(initialTrackName ?? "");
    setArtistName(initialArtistName ?? "");
    setAlbumName(initialAlbumName ?? "");
    setDuration(
      initialDuration !== undefined && Number.isFinite(initialDuration)
        ? String(Math.round(initialDuration))
        : ""
    );
    setLookupError(null);
    setLookupResult(null);
  }, [initialAlbumName, initialArtistName, initialDuration, initialTrackName, open]);

  useEffect(() => {
    if (!open || albumName.trim().length > 0 || !initialAppleMusicAlbumUrl) {
      return;
    }

    let isCancelled = false;

    async function hydrateAlbumMetadata() {
      try {
        const result = await resolveAppleMusicAlbumTracks(initialAppleMusicAlbumUrl);
        if (!result || isCancelled) {
          return;
        }

        setAlbumName((current) => current || result.albumName || "");
        setArtistName((current) => current || result.artistName || "");
      } catch (error) {
        console.error("Failed to prefill LRCLIB album metadata:", error);
      }
    }

    hydrateAlbumMetadata();

    return () => {
      isCancelled = true;
    };
  }, [albumName, initialAppleMusicAlbumUrl, open]);

  useEffect(() => {
    if (!open || duration.trim().length > 0 || !initialAudioUrl) {
      return;
    }

    let isCancelled = false;
    const audio = new Audio();

    const handleLoadedMetadata = () => {
      if (isCancelled || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        return;
      }

      setDuration(String(Math.round(audio.duration)));
    };

    const handleError = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);
    audio.src = initialAudioUrl;

    return () => {
      isCancelled = true;
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [duration, initialAudioUrl, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const syncedLineCount = useMemo(() => {
    if (!lookupResult?.syncedLyrics) {
      return 0;
    }

    return parseLRCLIBSyncedLyrics(lookupResult.syncedLyrics).filter(
      (line) => line.text.trim().length > 0
    ).length;
  }, [lookupResult]);

  async function handleLookup() {
    const trimmedTrackName = trackName.trim();
    const trimmedArtistName = artistName.trim();
    const trimmedAlbumName = albumName.trim();
    const parsedDuration = duration.trim().length > 0 ? Number(duration) : undefined;

    if (!trimmedTrackName) {
      setLookupError("Track title is required.");
      setLookupResult(null);
      return;
    }

    if (duration.trim().length > 0 && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      setLookupError("Duration must be a positive number of seconds.");
      setLookupResult(null);
      return;
    }

    setIsLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      if (trimmedArtistName && trimmedAlbumName && parsedDuration !== undefined) {
        const exactMatch = await getLRCLIBLyrics({
          trackName: trimmedTrackName,
          artistName: trimmedArtistName,
          albumName: trimmedAlbumName,
          duration: parsedDuration,
        });
        setLookupResult(exactMatch);
        return;
      }

      const searchResults = await searchLRCLIBLyrics({
        trackName: trimmedTrackName,
        artistName: trimmedArtistName || undefined,
        albumName: trimmedAlbumName || undefined,
      });

      if (searchResults.length === 0) {
        setLookupError("No LRCLIB match found for the metadata you entered.");
        return;
      }

      setLookupResult(searchResults[0]);
    } catch (error) {
      console.error("LRCLIB lookup failed:", error);
      setLookupError(
        error instanceof Error ? error.message : "Failed to look up LRCLIB lyrics."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10020,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.58)",
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: "calc(100vw - 40px)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgb(30, 33, 38)",
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Sync With LRCLIB
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.42)",
                lineHeight: 1.5,
              }}
            >
              This is optional. Use it when you want LRCLIB to draft rough timed lyric lines.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          style={{
            padding: "18px 20px 20px",
            overflowY: "auto",
            display: "grid",
            gap: 14,
          }}
        >
          {[
            {
              label: "Track title",
              value: trackName,
              onChange: setTrackName,
              placeholder: "Song title",
            },
            {
              label: "Artist",
              value: artistName,
              onChange: setArtistName,
              placeholder: "Artist name",
            },
            {
              label: "Album (optional)",
              value: albumName,
              onChange: setAlbumName,
              placeholder: "Album name",
            },
          ].map((field) => (
            <label
              key={field.label}
              style={{ display: "grid", gap: 6 }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.72)",
                }}
              >
                {field.label}
              </span>
              <input
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
          ))}

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.5)",
              lineHeight: 1.55,
            }}
          >
            Fields are prefilled from the current project when available. Album is optional, and duration is detected automatically when the audio metadata is available.
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.10)",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.75)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleLookup}
              disabled={isLoading}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.14)",
                backgroundColor: "rgba(255, 255, 255, 0.10)",
                color: "rgba(255, 255, 255, 0.9)",
                cursor: isLoading ? "default" : "pointer",
                fontSize: 12,
                fontWeight: 600,
                opacity: isLoading ? 0.65 : 1,
              }}
            >
              {isLoading ? "Looking up..." : "Find Lyrics"}
            </button>
          </div>

          {lookupError ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 120, 120, 0.22)",
                backgroundColor: "rgba(255, 120, 120, 0.08)",
                color: "rgba(255, 150, 150, 0.96)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {lookupError}
            </div>
          ) : null}

          {lookupResult ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.88)",
                }}
              >
                Match found
              </div>
              <div style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.86)" }}>
                {lookupResult.trackName} • {lookupResult.artistName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.48)" }}>
                {lookupResult.albumName} • {Math.round(lookupResult.duration)}s
              </div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.58)", lineHeight: 1.5 }}>
                {hasLRCLIBSyncedLyrics(lookupResult)
                  ? `Synced lyrics available with ${syncedLineCount} timed lines.`
                  : "This record only has plain lyrics right now."}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}