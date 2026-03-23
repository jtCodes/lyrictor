import { DialogContainer, Flex, View } from "@adobe/react-spectrum";
import formatDuration from "format-duration";
import { useEffect, useRef, useState } from "react";
import GenerateAIImageButton from "../../Image/AI/GenerateAIImageButton";
import PlayPauseButton from "../PlayBackControls";
import EditDropDownMenu, {
  EditOptionType,
  ToolsMenuOptionType,
} from "../../EditDropDownMenu";
import AddVisualizerButton from "./AddVisualizerButton";
import AddLyricTextButton from "./AddLyricTextButton";
import ExportVideoButton from "../../Export/ExportVideoButton";
import { useProjectStore } from "../../../Project/store";
import TimelineListViewDialog from "./TimelineListViewDialog";
import {
  widthFromZoomSliderValue,
  zoomSliderValueFromWidth,
} from "../zoom";

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
        width: 100,
        height: 24,
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 4,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.18)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: `${percent}%`,
          height: 4,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.72)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `calc(${percent}% - 8px)`,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#1f2126",
          border: "2px solid rgba(255, 255, 255, 0.92)",
          boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.28), 0 4px 14px rgba(0, 0, 0, 0.35)",
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
  play,
  pause,
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
  play: () => void;
  pause: () => void;
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
        }}
      >
        <Flex
          direction="row"
          gap="size-100"
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Flex marginStart={10} alignItems={"center"} gap={"size-100"}>
            <View>
              <EditDropDownMenu onItemClick={handleDropdownItemClick} />
            </View>
            <View>
              <AddLyricTextButton position={position} />
            </View>
            <View>
              <GenerateAIImageButton position={position} />
            </View>
            <View>
              <AddVisualizerButton position={position} />
            </View>
          </Flex>

          <View>
            <Flex
              direction="row"
              gap="size-100"
              alignItems={"center"}
              justifyContent={"space-between"}
            >
              <PlayPauseButton
                isPlaying={playing}
                onPlayPauseClicked={() => {
                  togglePlayPause();
                }}
              />
              <View backgroundColor={"gray-100"} borderRadius={"regular"}>
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
              </View>
            </Flex>
          </View>

          <View alignSelf={"center"} marginEnd={10} minWidth={200}>
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
              {/* <View marginStart={10}>
                <CustomizationPanelButton />
              </View> */}
              <View marginStart={10}>
                <ExportVideoButton
                  duration={duration}
                  seek={seek}
                  play={play}
                  pause={pause}
                />
              </View>
            </Flex>
          </View>
        </Flex>
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
