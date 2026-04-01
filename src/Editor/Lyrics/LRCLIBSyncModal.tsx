import { useEffect, useMemo, useRef, useState } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import {
  getLRCLIBLyrics,
  hasLRCLIBSyncedLyrics,
  LRCLIBLyricsRecord,
  parseLRCLIBSyncedLyrics,
  searchLRCLIBLyrics,
} from "../../api/lrclib";

export default function LRCLIBSyncModal({
  open,
  onClose,
  initialTrackName,
  initialArtistName,
  initialDuration,
  initialAudioUrl,
  onUseMatch,
}: {
  open: boolean;
  onClose: () => void;
  initialTrackName?: string;
  initialArtistName?: string;
  initialDuration?: number;
  initialAudioUrl?: string;
  onUseMatch?: (record: LRCLIBLyricsRecord) => Promise<void> | void;
}) {
  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingMatch, setIsUsingMatch] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<LRCLIBLyricsRecord[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTrackName(initialTrackName ?? "");
    setArtistName(initialArtistName ?? "");
    setAlbumName("");
    setDuration(
      initialDuration !== undefined && Number.isFinite(initialDuration)
        ? String(Math.round(initialDuration))
        : ""
    );
    setLookupError(null);
    setLookupResults([]);
    setSelectedResultId(null);
  }, [initialArtistName, initialDuration, initialTrackName, open]);

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

  const selectedResult = useMemo(() => {
    if (lookupResults.length === 0) {
      return null;
    }

    return (
      lookupResults.find((result) => result.id === selectedResultId) ??
      lookupResults[0]
    );
  }, [lookupResults, selectedResultId]);

  const syncedLineCount = useMemo(() => {
    if (!selectedResult?.syncedLyrics) {
      return 0;
    }

    return parseLRCLIBSyncedLyrics(selectedResult.syncedLyrics).filter(
      (line) => line.text.trim().length > 0
    ).length;
  }, [selectedResult]);

  async function handleLookup() {
    const trimmedTrackName = trackName.trim();
    const trimmedArtistName = artistName.trim();
    const trimmedAlbumName = albumName.trim();
    const parsedDurationValue = duration.trim().length > 0 ? Number(duration) : undefined;
    const hasParsedDuration = parsedDurationValue !== undefined;
    const parsedDuration = hasParsedDuration ? parsedDurationValue : 0;

    if (!trimmedTrackName) {
      setLookupError("Track title is required.");
      setLookupResults([]);
      setSelectedResultId(null);
      return;
    }

    if (hasParsedDuration && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      setLookupError("Duration must be a positive number of seconds.");
      setLookupResults([]);
      setSelectedResultId(null);
      return;
    }

    setIsLoading(true);
    setLookupError(null);
    setLookupResults([]);
    setSelectedResultId(null);

    try {
      if (trimmedArtistName && trimmedAlbumName && hasParsedDuration) {
        const exactMatch = await getLRCLIBLyrics({
          trackName: trimmedTrackName,
          artistName: trimmedArtistName,
          albumName: trimmedAlbumName,
          duration: parsedDuration,
        });
        setLookupResults([exactMatch]);
        setSelectedResultId(exactMatch.id);
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

      setLookupResults(searchResults);
      setSelectedResultId(searchResults[0].id);
    } catch (error) {
      console.error("LRCLIB lookup failed:", error);
      setLookupError(
        error instanceof Error ? error.message : "Failed to look up LRCLIB lyrics."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUseMatch() {
    if (!selectedResult || !onUseMatch) {
      return;
    }

    setIsUsingMatch(true);

    try {
      await onUseMatch(selectedResult);
      ToastQueue.positive("LRCLIB match saved to project", { timeout: 3000 });
      onClose();
    } catch (error) {
      console.error("Failed to save LRCLIB match:", error);
      ToastQueue.negative("Failed to save LRCLIB match", { timeout: 4000 });
    } finally {
      setIsUsingMatch(false);
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
            Track and artist are prefilled from the current project when available. Album is optional, and duration is detected automatically when the audio metadata is available.
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

          {lookupResults.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.88)",
                }}
              >
                {lookupResults.length === 1 ? "Match found" : `Matches found (${lookupResults.length})`}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  paddingRight: 2,
                }}
              >
                {lookupResults.map((result) => {
                  const isSelected = result.id === selectedResult?.id;

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSelectedResultId(result.id)}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: isSelected
                          ? "1px solid rgba(255, 255, 255, 0.20)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        backgroundColor: isSelected
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.03)",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "grid",
                        gap: 5,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {result.trackName} • {result.artistName}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.48)" }}>
                        {result.albumName} • {Math.round(result.duration)}s
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.58)", lineHeight: 1.5 }}>
                        {hasLRCLIBSyncedLyrics(result)
                          ? `${parseLRCLIBSyncedLyrics(result.syncedLyrics).filter((line) => line.text.trim().length > 0).length} timed lines available`
                          : "Plain lyrics only"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedResult ? (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.58)",
                    lineHeight: 1.5,
                  }}
                >
                  {hasLRCLIBSyncedLyrics(selectedResult)
                    ? `Selected match has synced lyrics with ${syncedLineCount} timed lines.`
                    : "Selected match only has plain lyrics right now."}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleUseMatch}
                  disabled={!selectedResult || !hasLRCLIBSyncedLyrics(selectedResult) || isUsingMatch}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    color: "rgba(255, 255, 255, 0.9)",
                    cursor:
                      !selectedResult || !hasLRCLIBSyncedLyrics(selectedResult) || isUsingMatch
                        ? "default"
                        : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    opacity:
                      !selectedResult || !hasLRCLIBSyncedLyrics(selectedResult) || isUsingMatch
                        ? 0.6
                        : 1,
                  }}
                >
                  {isUsingMatch ? "Applying..." : "Use Synced Lyrics"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}