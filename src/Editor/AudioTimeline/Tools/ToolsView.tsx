import { DialogContainer, Flex, Slider, View } from "@adobe/react-spectrum";
import formatDuration from "format-duration";
import { useState } from "react";
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
              <View UNSAFE_style={{ display: "flex", alignItems: "center" }}>
                <Slider
                  width={100}
                  aria-label="slider"
                  minValue={0}
                  maxValue={1}
                  formatOptions={{ style: "percent" }}
                  value={sliderValue}
                  step={0.002}
                  label={null}
                  showValueLabel={false}
                  onChange={(value) => {
                    const newWidth = widthFromZoomSliderValue(initWidth, value, duration);
                    setWidth(newWidth);
                  }}
                  isFilled
                />
              </View>
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
