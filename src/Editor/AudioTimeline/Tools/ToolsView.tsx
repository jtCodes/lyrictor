import { ActionButton, DialogContainer, Flex, View } from "@adobe/react-spectrum";
import formatDuration from "format-duration";
import { useEffect, useRef, useState } from "react";
import PlayPauseButton from "../PlayBackControls";
import EditDropDownMenu, {
  EditOptionType,
  ToolsMenuOptionType,
} from "../../EditDropDownMenu";
import AddVisualElementMenuButton from "./AddVisualElementMenuButton";
import TinySoundMeter from "./TinySoundMeter";
import { useProjectStore } from "../../../Project/store";
import TimelineListViewDialog from "./TimelineListViewDialog";
import {
  widthFromZoomSliderValue,
  zoomSliderValueFromWidth,
} from "../zoom";
import { headerButtonStyle } from "../../../theme";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, step: number) {
  return min + Math.round((value - min) / step) * step;
}

function ZoomSlider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackRectRef = useRef<DOMRect | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  function updateValue(clientX: number) {
    const rect = trackRectRef.current;
    if (!rect || rect.width <= 0) {
      return;
    }

    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextValue = snapToStep(min + ratio * (max - min), min, step);
    onChangeRef.current(clamp(nextValue, min, max));
  }

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      updateValue(event.clientX);
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      updateValue(event.clientX);
      activePointerIdRef.current = null;
      trackRectRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, max, min, step]);

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      onPointerDown={(event) => {
        activePointerIdRef.current = event.pointerId;
        trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
        setIsDragging(true);
        event.preventDefault();
        updateValue(event.clientX);
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 112,
        height: 30,
        padding: "0 10px",
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          height: 3,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.12)",
          boxShadow: "inset 0 1px 1px rgba(0, 0, 0, 0.4)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          width: `calc((100% - 24px) * ${percent / 100})`,
          height: 3,
          borderRadius: 999,
          background: "linear-gradient(90deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.82))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(12px + (100% - 24px) * ${percent / 100} - 6px)`,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: isDragging ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.88)",
          boxShadow: isDragging
            ? "0 0 0 4px rgba(255, 255, 255, 0.12), 0 1px 8px rgba(0, 0, 0, 0.32)"
            : "0 1px 6px rgba(0, 0, 0, 0.28)",
          transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
          transform: isDragging ? "scale(1.08)" : "scale(1)",
        }}
      />
    </div>
  );
}

export function ToolsView({
  playing,
  togglePlayPause,
  percentComplete,
  duration,
  position,
  initWidth,
  currentWidth,
  setWidth,
  onItemClick,
  seek,
  loopEnabled,
  onLoopToggle,
}: {
  playing: boolean;
  togglePlayPause: () => void;
  percentComplete: number;
  duration: number;
  position: number;
  initWidth: number;
  currentWidth: number;
  setWidth: (newWidth: number) => void;
  onItemClick: (option: EditOptionType) => void;
  seek: (time: number) => void;
  loopEnabled: boolean;
  onLoopToggle: () => void;
}) {
  const [isTimelineListViewOpen, setIsTimelineListViewOpen] = useState(false);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const sliderValue = zoomSliderValueFromWidth(initWidth, currentWidth, duration);

  function handleTimelineListViewOpenChange(isOpen: boolean) {
    setIsTimelineListViewOpen(isOpen);
    setIsPopupOpen(isOpen);
  }

  function handleDropdownItemClick(option: ToolsMenuOptionType) {
    if (option === "timeline-list-view") {
      handleTimelineListViewOpenChange(true);
      return;
    }

    onItemClick(option as EditOptionType);
  }

  return (
    <>
      <View
        padding={2.5}
        UNSAFE_style={{
          background: "rgba(38, 40, 44, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "center",
            width: "100%",
            columnGap: 12,
          }}
        >
          <Flex marginStart={10} alignItems={"center"} gap={"size-125"} minWidth={0}>
            <View>
              <EditDropDownMenu onItemClick={handleDropdownItemClick} />
            </View>
            <View>
              <AddVisualElementMenuButton position={position} />
            </View>
          </Flex>

          <View justifySelf="center">
            <Flex
              direction="row"
              gap="size-100"
              alignItems={"center"}
              justifyContent={"center"}
            >
              <ActionButton
                aria-label={loopEnabled ? "Disable loop playback" : "Enable loop playback"}
                isQuiet
                UNSAFE_style={{
                  ...headerButtonStyle(loopEnabled),
                  width: 30,
                  minWidth: 30,
                  height: 30,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={onLoopToggle}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2.25 5.25A2.75 2.75 0 0 1 5 2.5h6.1L9.7 1.1a.75.75 0 1 1 1.06-1.06l2.68 2.68a.75.75 0 0 1 0 1.06l-2.68 2.68A.75.75 0 0 1 9.7 5.4L11.1 4H5a1.25 1.25 0 0 0-1.25 1.25v1a.75.75 0 0 1-1.5 0v-1Z"
                    fill={loopEnabled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.68)"}
                  />
                  <path
                    d="M13.75 10.75A2.75 2.75 0 0 1 11 13.5H4.9l1.4 1.4a.75.75 0 1 1-1.06 1.06l-2.68-2.68a.75.75 0 0 1 0-1.06l2.68-2.68A.75.75 0 0 1 6.3 10.6L4.9 12H11a1.25 1.25 0 0 0 1.25-1.25v-1a.75.75 0 0 1 1.5 0v1Z"
                    fill={loopEnabled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.68)"}
                  />
                </svg>
              </ActionButton>
              <PlayPauseButton
                isPlaying={playing}
                onPlayPauseClicked={() => {
                  togglePlayPause();
                }}
              />
              <div
                style={{
                  borderRadius: 8,
                  background: "rgba(30, 31, 34, 0.92)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                }}
              >
                <Flex
                  direction="row"
                  gap="size-100"
                  alignItems={"center"}
                  justifyContent={"space-between"}
                >
                  <View width={50} padding={5}>
                    {formatDuration((percentComplete / 100) * duration * 1000)}
                  </View>
                  /
                  <View width={50} padding={5}>
                    {formatDuration(duration * 1000)}{" "}
                  </View>
                </Flex>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  minWidth: 28,
                  height: 30,
                  boxSizing: "border-box",
                  marginLeft: 6,
                  paddingTop: 4,
                  paddingBottom: 4,
                  paddingRight: 2,
                  opacity: playing ? 0.8 : 0.55,
                }}
              >
                <TinySoundMeter
                  playing={playing}
                  scale={0.9}
                  heightScale={1.45}
                  fillWidth
                />
              </div>
            </Flex>
          </View>

          <View alignSelf={"center"} justifySelf="end" marginEnd={10} minWidth={200}>
            <Flex direction="row" alignItems={"center"} justifyContent={"end"}>
              <ZoomSlider
                min={0}
                max={1}
                step={0.002}
                value={sliderValue}
                onChange={(value) => {
                  const newWidth = widthFromZoomSliderValue(initWidth, value, duration);
                  setWidth(newWidth);
                }}
              />
            </Flex>
          </View>
        </div>
      </View>

      <DialogContainer
        type="fullscreen"
        onDismiss={() => handleTimelineListViewOpenChange(false)}
      >
        {isTimelineListViewOpen ? (
          <TimelineListViewDialog
            duration={duration}
            position={position}
            seek={seek}
            playing={playing}
            togglePlayPause={togglePlayPause}
            onClose={() => handleTimelineListViewOpenChange(false)}
          />
        ) : null}
      </DialogContainer>
    </>
  );
}
