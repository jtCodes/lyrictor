import { ReactNode, useEffect, useState } from "react";
import { Slider, View } from "@adobe/react-spectrum";
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
  projectName: string;
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
  const {
    controlsVisible,
    isOverlayHidden,
    showControls,
    handleMouseLeave,
    handleMouseMove,
    handleBackgroundTouchEnd,
    handleBackgroundClick,
  } = usePlaybackOverlayVisibility(playing, {
    ...overlayOptions,
    loading,
  });

  useEffect(() => {
    setSeekerPosition((percentComplete / 100) * duration);
  }, [position, width, duration, percentComplete]);

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
            bottom: isMobile ? 68 : 55,
            left: 20,
            right: isMobile ? 20 : 132,
            pointerEvents: controlsVisible ? "auto" : "none",
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
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            zIndex: 3,
          }}
        >
          <Slider
            aria-label="Audio preview position"
            value={seekerPosition}
            maxValue={duration}
            showValueLabel={false}
            defaultValue={0}
            step={1}
            isFilled
            width={width - 40}
            onChangeEnd={(value) => {
              seek(value);
              showControls();
            }}
          />
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 15,
            left: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            fontSize: 10,
            opacity: 0.9,
          }}
        >
          {formatDuration((percentComplete / 100) * duration * 1000)}
        </View>
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 15,
            right: 20,
            pointerEvents: controlsVisible ? "auto" : "none",
            fontSize: 10,
            opacity: 0.9,
          }}
        >
          -{formatDuration((1 - percentComplete / 100) * duration * 1000)}
        </View>
      </View>
    </div>
  );
}