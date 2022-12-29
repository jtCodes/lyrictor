import {
  ActionButton,
  Flex,
  Slider,
  Tooltip,
  TooltipTrigger,
  View,
} from "@adobe/react-spectrum";
import Add from "@spectrum-icons/workflow/Add";
import Capitals from "@spectrum-icons/workflow/Capitals";
import formatDuration from "format-duration";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
import PlayBackControls from "../PlayBackControls";

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
}) {
  const addLyricText = useProjectStore((state) => state.addNewLyricText);
  const lyricTexts = useProjectStore((state) => state.lyricTexts)
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts)
  const selectedPreviewTextIds = useEditorStore(
    (state) => state.selectedPreviewTextIds
  );

  return (
    <View padding={2.5} backgroundColor={"gray-200"}>
      <Flex
        direction="row"
        gap="size-100"
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <View marginStart={10}>
          <TooltipTrigger delay={1000}>
            <ActionButton
              isQuiet
              width={"size-10"}
              onPress={() => {
                addLyricText("text", position);
              }}
            >
              <Add />
            </ActionButton>
            <Tooltip>Add new lyric at cursor</Tooltip>
          </TooltipTrigger>
        </View>

        <View>
          <Flex
            direction="row"
            gap="size-100"
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <PlayBackControls
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
            {selectedPreviewTextIds.size > 0 ? (
              <View marginEnd={20}>
                <ActionButton
                  isQuiet
                  width={"size-10"}
                  onPress={() => {
                    const updateLyricTexts = lyricTexts.map(
                      (curLoopLyricText: LyricText, updatedIndex: number) => {
                        if (selectedPreviewTextIds.has(curLoopLyricText.id)) {
                          return {
                            ...curLoopLyricText,
                            fontSize: 24
                          };
                        }
              
                        return curLoopLyricText;
                      }
                    );
              
                    setLyricTexts(updateLyricTexts);
                  }}
                >
                  <Capitals />
                </ActionButton>
              </View>
            ) : null}
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
          </Flex>
        </View>
      </Flex>
    </View>
  );
}
