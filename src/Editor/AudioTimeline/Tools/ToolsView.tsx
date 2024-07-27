import { Flex, Slider, View } from "@adobe/react-spectrum";
import formatDuration from "format-duration";
import GenerateAIImageButton from "../../Image/AI/GenerateAIImageButton";
import PlayPauseButton from "../PlayBackControls";
import EditDropDownMenu, { EditOptionType } from "../../EditDropDownMenu";
import AddVisualizerButton from "./AddVisualizerButton";
import AddLyricTextButton from "./AddLyricTextButton";

export function ToolsView({
  playing,
  togglePlayPause,
  percentComplete,
  duration,
  position,
  zoomStep,
  zoomAmount,
  initWidth,
  currentWidth,
  windowWidth,
  calculateScrollbarLength,
  setWidth,
  onItemClick,
}: {
  playing: boolean;
  togglePlayPause: () => void;
  percentComplete: number;
  duration: number;
  position: number;
  zoomStep: number;
  zoomAmount: number;
  initWidth: number;
  currentWidth: number;
  windowWidth: number | undefined;
  calculateScrollbarLength: () => number;
  setWidth: (newWidth: number) => void;
  onItemClick: (option: EditOptionType) => void;
}) {
  return (
    <View padding={2.5} backgroundColor={"gray-200"}>
      <Flex
        direction="row"
        gap="size-100"
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Flex marginStart={10} alignItems={"center"} gap={"size-100"}>
          <View>
            <EditDropDownMenu onItemClick={onItemClick} />
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
            <View>
              <Slider
                width={100}
                aria-label="slider"
                minValue={0}
                maxValue={15}
                formatOptions={{ style: "percent" }}
                defaultValue={0}
                step={zoomStep}
                onChange={(value) => {
                  const newWidth: number = initWidth + initWidth * value;
                  const scrollableArea: number =
                    windowWidth! - calculateScrollbarLength();
                  const isZoomIn: boolean = newWidth > currentWidth;
                  let velocity: number;

                  setWidth(newWidth);
                }}
                isFilled
              />
            </View>
            {/* <View marginStart={10}>
              <CustomizationPanelButton />
            </View> */}
          </Flex>
        </View>
      </Flex>
    </View>
  );
}
