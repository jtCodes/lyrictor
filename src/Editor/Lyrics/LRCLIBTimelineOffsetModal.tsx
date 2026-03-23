import { useEffect, useMemo, useState } from "react";
import formatDuration from "format-duration";
import PlayPauseButton from "../AudioTimeline/PlayBackControls";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSecondsLabel(seconds: number) {
  return formatDuration(Math.max(0, seconds) * 1000);
}

export default function LRCLIBTimelineOffsetModal({
  open,
  onClose,
  onConfirm,
  initialOffsetSeconds,
  playing,
  clipPositionSeconds,
  clipDurationSeconds,
  songDurationSeconds,
  onTogglePlayPause,
  onSeekClip,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (offsetSeconds: number) => Promise<void> | void;
  initialOffsetSeconds: number;
  playing: boolean;
  clipPositionSeconds: number;
  clipDurationSeconds: number;
  songDurationSeconds: number;
  onTogglePlayPause: () => void;
  onSeekClip: (seconds: number) => void;
}) {
  const maxSongOffset = useMemo(
    () => Math.max(0, Number.isFinite(songDurationSeconds) ? songDurationSeconds : 0),
    [songDurationSeconds]
  );
  const maxClipPosition = useMemo(
    () => Math.max(0, Number.isFinite(clipDurationSeconds) ? clipDurationSeconds : 0),
    [clipDurationSeconds]
  );
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOffsetSeconds(clamp(initialOffsetSeconds, 0, maxSongOffset));
    setIsSubmitting(false);
  }, [initialOffsetSeconds, maxSongOffset, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, open]);

  async function handleConfirmClick() {
    setIsSubmitting(true);

    try {
      await onConfirm(clamp(offsetSeconds, 0, maxSongOffset));
    } finally {
      setIsSubmitting(false);
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
        zIndex: 10030,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.58)",
      }}
    >
      <div
        style={{
          width: 500,
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
              LRCLIB Start Offset
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.42)",
                lineHeight: 1.5,
              }}
            >
              Set where this clip begins in the full song before importing timed lyric items.
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: isSubmitting ? "default" : "pointer",
              padding: 4,
              borderRadius: 6,
              opacity: isSubmitting ? 0.5 : 1,
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
            gap: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 14,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.035)",
              boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.82)",
                  }}
                >
                  Clip Preview
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {formatSecondsLabel(clipPositionSeconds)} / {formatSecondsLabel(maxClipPosition)}
                </div>
              </div>
              <PlayPauseButton
                isPlaying={playing}
                onPlayPauseClicked={onTogglePlayPause}
              />
            </div>

            <input
              type="range"
              min={0}
              max={maxClipPosition > 0 ? maxClipPosition : 1}
              step={0.01}
              value={clamp(clipPositionSeconds, 0, maxClipPosition > 0 ? maxClipPosition : 1)}
              onChange={(event) => onSeekClip(Number(event.currentTarget.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.82)",
                  }}
                >
                  Clip Starts At
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.5)",
                    lineHeight: 1.45,
                  }}
                >
                  This is the timestamp in the full song that matches the beginning of your project audio.
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.9)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatSecondsLabel(offsetSeconds)}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={maxSongOffset > 0 ? maxSongOffset : 1}
              step={0.1}
              value={clamp(offsetSeconds, 0, maxSongOffset > 0 ? maxSongOffset : 1)}
              onChange={(event) => setOffsetSeconds(Number(event.currentTarget.value))}
              style={{ width: "100%" }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setOffsetSeconds(0)}
                style={{
                  minHeight: 30,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.42)",
                }}
              >
                Full song length: {formatSecondsLabel(maxSongOffset)}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              minHeight: 34,
              padding: "0 14px",
              borderRadius: 9,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "rgba(255, 255, 255, 0.76)",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting}
            style={{
              minHeight: 34,
              padding: "0 14px",
              borderRadius: 9,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.94)",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Importing..." : "Save Offset + Add Lyrics"}
          </button>
        </div>
      </div>
    </div>
  );
}