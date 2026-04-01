import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { View } from "@adobe/react-spectrum";
import { useAudioPosition } from "react-use-audio-player";
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
  titleOnClick?: () => void;
  topRightContent?: ReactNode;
  overlayOptions?: {
    hideByDefault?: boolean;
    revealWhenPaused?: boolean;
    suppressRevealWhileLoading?: boolean;
  };
}) {
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: false,
  });
  const [seekerPosition, setSeekerPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
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

  useEffect(() => {
    if (isSeeking) {
      return;
    }

    setSeekerPosition((percentComplete / 100) * duration);
  }, [duration, isSeeking, percentComplete, position, width]);

  const maxSeekValue = Math.max(duration, 0);
  const sliderProgress =
    maxSeekValue > 0 ? Math.min(100, Math.max(0, (seekerPosition / maxSeekValue) * 100)) : 0;
  const horizontalPadding = 20;
  const controlClusterBottom = isMobile ? 18 : 20;
  const titleRightInset = isMobile ? 0 : 112;

  function stopOverlayEvent(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    showControls();
  }

  function commitSeek(nextValue: number) {
    const clampedValue = Math.min(Math.max(nextValue, 0), maxSeekValue);
    setSeekerPosition(clampedValue);
    seek(clampedValue);
    showControls();
  }

  function handleSeekChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);

    setSeekerPosition(nextValue);
    seek(nextValue);
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
        UNSAFE_style={{
          position: "absolute",
          height,
          width,
          backgroundColor: "rgba(0,0,0,0.3)",
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: "none",
        }}
      >
        {topRightContent ? (
          <View
            UNSAFE_style={{
              position: "absolute",
              top: isMobile ? 8 : 5,
              right: 8,
              pointerEvents: controlsVisible ? "auto" : "none",
              zIndex: 5,
            }}
          >
            {topRightContent}
          </View>
        ) : null}
        <View
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
          {projectName ? (
            <View
              UNSAFE_style={{
                marginBottom: 10,
                paddingLeft: 2,
                paddingRight: titleRightInset,
                fontSize: isMobile ? 12 : 14,
                opacity: 0.9,
                fontWeight: "bold",
                lineHeight: 1.2,
                textShadow: "0 1px 3px rgba(0, 0, 0, 0.6)",
                textAlign: "left",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
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
            </View>
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
              onKeyDown={() => {
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
              fontSize: 10,
              opacity: 0.9,
            }}
          >
            <span>{formatDuration((percentComplete / 100) * duration * 1000)}</span>
            <span>-{formatDuration((1 - percentComplete / 100) * duration * 1000)}</span>
          </View>
        </View>
      </View>
    </div>
  );
}