import { ChangeEvent, ReactNode, useRef, useState } from "react";
import { View } from "@adobe/react-spectrum";
import { useAudioPosition } from "../Editor/AudioTimeline/useAudioPosition";
import PlayPauseButton from "../Editor/AudioTimeline/PlayBackControls";
import formatDuration from "format-duration";
import { isMobile } from "../utils";
import { usePlaybackOverlayVisibility } from "./usePlaybackOverlayVisibility";

export default function ProjectPlaybackControlsOverlay({
  width,
  height,
  loading,
  playing,
  togglePlayPause,
  projectName,
  albumArtSrc,
  titleOnClick,
  topRightContent,
  overlayOptions,
}: {
  width: number;
  height: number;
  loading?: boolean;
  playing: boolean;
  togglePlayPause: () => void;
  projectName?: string;
  albumArtSrc?: string;
  titleOnClick?: () => void;
  topRightContent?: ReactNode;
  overlayOptions?: {
    hideByDefault?: boolean;
    revealWhenPaused?: boolean;
    suppressRevealWhileLoading?: boolean;
  };
}) {
  const { percentComplete, duration, seek } = useAudioPosition({
    highRefreshRate: false,
  });
  const [seekDraftPosition, setSeekDraftPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [failedArtworkSrc, setFailedArtworkSrc] = useState<string>();
  const showArtwork = Boolean(albumArtSrc && albumArtSrc !== failedArtworkSrc);
  const backgroundTouchTimestampRef = useRef(0);
  const {
    controlsVisible,
    isOverlayHidden,
    showControls,
    handleMouseLeave,
    handleMouseMove,
  } = usePlaybackOverlayVisibility(playing, {
    ...overlayOptions,
    loading,
  });

  const maxSeekValue = Math.max(duration, 0);
  const playbackPosition = (percentComplete / 100) * duration;
  const seekerPosition = isSeeking ? seekDraftPosition : playbackPosition;
  const sliderProgress =
    maxSeekValue > 0 ? Math.min(100, Math.max(0, (seekerPosition / maxSeekValue) * 100)) : 0;
  const horizontalPadding = 20;
  const controlClusterBottom = isMobile ? 18 : 20;

  function stopOverlayEvent(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    showControls();
  }

  function commitSeek(nextValue: number) {
    const clampedValue = Math.min(Math.max(nextValue, 0), maxSeekValue);
    setSeekDraftPosition(clampedValue);
    seek(clampedValue, { userInitiated: true });
    showControls();
  }

  function handleSeekChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);

    setSeekDraftPosition(nextValue);
    seek(nextValue, { userInitiated: true });
    showControls();
  }

  function handleBackgroundActivate() {
    showControls();
    togglePlayPause();
  }

  function handleBackgroundTouchEnd() {
    backgroundTouchTimestampRef.current = Date.now();
    handleBackgroundActivate();
  }

  function handleBackgroundClick() {
    if (isMobile && Date.now() - backgroundTouchTimestampRef.current < 500) {
      return;
    }

    handleBackgroundActivate();
  }

  return (
    <div
      style={{
        position: "relative",
        height,
        width,
        cursor: isOverlayHidden ? "none" : undefined,
        zIndex: 20,
        touchAction: "manipulation",
      }}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "auto",
        }}
        onTouchEnd={handleBackgroundTouchEnd}
        onClick={handleBackgroundClick}
      />
      <View
        UNSAFE_className="preview-player-controls"
        UNSAFE_style={{
          position: "absolute",
          height,
          width,
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: "none",
        }}
      >
        {topRightContent ? (
          <View
            UNSAFE_style={{
              position: "absolute",
              top: isMobile ? "max(8px, env(safe-area-inset-top))" : 5,
              right: 8,
              pointerEvents: controlsVisible ? "auto" : "none",
              zIndex: 5,
            }}
          >
            {topRightContent}
          </View>
        ) : null}
        <View
          UNSAFE_className="preview-player-play"
          UNSAFE_style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 4,
          }}
        >
          <PlayPauseButton
            isPlaying={playing}
            onPlayPauseClicked={() => togglePlayPause()}
          />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: controlClusterBottom,
            left: horizontalPadding,
            right: horizontalPadding,
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 3,
          }}
        >
          {projectName || showArtwork ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {showArtwork ? (
                <img
                  src={albumArtSrc}
                  alt="Album artwork"
                  draggable={false}
                  onError={() => setFailedArtworkSrc(albumArtSrc)}
                  style={{
                    width: isMobile ? 36 : 44,
                    height: isMobile ? 36 : 44,
                    flexShrink: 0,
                    objectFit: "cover",
                    borderRadius: 5,
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.35)",
                  }}
                />
              ) : null}
            {projectName ? <View
              UNSAFE_style={{
                minWidth: 0,
                padding: "3px 2px",
                width: "fit-content",
                maxWidth: "100%",
                boxSizing: "border-box",
                color: "#fff",
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                lineHeight: 1.2,
                filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 14px rgba(0, 0, 0, 0.7))",
                textAlign: "left",
              }}
            >
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {titleOnClick ? (
                <span
                  onClick={() => {
                    titleOnClick();
                    showControls();
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {projectName}
                </span>
              ) : (
                projectName
              )}
              </div>
            </View> : null}
            </div>
          ) : null}
          <div
            onClick={stopOverlayEvent}
            onMouseDown={stopOverlayEvent}
            onTouchStart={stopOverlayEvent}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: 22,
            }}
          >
            <input
              aria-label="Audio preview position"
              className="preview-player-slider"
              type="range"
              min={0}
              max={maxSeekValue > 0 ? maxSeekValue : 0}
              step={0.01}
              value={Math.min(seekerPosition, maxSeekValue)}
              onPointerDown={(event) => {
                stopOverlayEvent(event);
                setSeekDraftPosition(Number(event.currentTarget.value));
                setIsSeeking(true);
              }}
              onPointerUp={(event) => {
                stopOverlayEvent(event);
                commitSeek(Number(event.currentTarget.value));
                setIsSeeking(false);
              }}
              onPointerCancel={() => {
                setIsSeeking(false);
              }}
              onChange={handleSeekChange}
              onKeyDown={(event) => {
                setSeekDraftPosition(Number(event.currentTarget.value));
                setIsSeeking(true);
              }}
              onKeyUp={(event) => {
                commitSeek(Number(event.currentTarget.value));
                setIsSeeking(false);
              }}
              style={{
                width: "100%",
                ["--preview-slider-progress" as string]: `${sliderProgress}%`,
              }}
            />
          </div>
          <View
            UNSAFE_style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              paddingLeft: 2,
              paddingRight: 2,
              fontSize: 11,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span className="preview-player-time">{formatDuration((percentComplete / 100) * duration * 1000)}</span>
            <span className="preview-player-time">-{formatDuration((1 - percentComplete / 100) * duration * 1000)}</span>
          </View>
        </View>
      </View>
    </div>
  );
}
