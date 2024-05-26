import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { Checkbox, Flex, Slider, View } from "@adobe/react-spectrum";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { VisualizerSetting } from "./store";
import { ColorResult } from "react-color";

export default function AudioVisualizerSettings({ width }: { width: number }) {
  const modifyLVisualizerSettings = useProjectStore(
    (state) => state.modifyVisualizerSettings
  );
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const visualizerSettingSelected = useMemo(() => {
    if (selectedLyricTextIds.size === 1) {
      return lyricTexts.find(
        (lyricText) =>
          lyricText.isVisualizer && selectedLyricTextIds.has(lyricText.id)
      );
    }
  }, [lyricTexts, selectedLyricTextIds]);

  function handleBeatSyncIntensityEnableChange(
    key: keyof VisualizerSetting,
    isSelected: boolean
  ) {
    if (visualizerSettingSelected?.visualizerSettings) {
      modifyLVisualizerSettings(key, [visualizerSettingSelected.id], {
        value:
          visualizerSettingSelected.visualizerSettings
            .fillRadialGradientEndRadius.value,
        beatSyncIntensity: isSelected ? 1 : 0,
      });
    }
  }

  if (
    visualizerSettingSelected &&
    visualizerSettingSelected.visualizerSettings
  ) {
    return (
      <View width={width}>
        <Flex direction={"column"} gap={"size-300"}>
          <CustomizationSettingRow
            label={"Color Stops"}
            value={""}
            settingComponent={
              <View>
                {visualizerSettingSelected.visualizerSettings.fillRadialGradientColorStops.map(
                  (stop, index) => {
                    return (
                      <View>
                        <Slider
                          width={width - 20}
                          step={0.1}
                          minValue={0}
                          maxValue={500}
                          value={stop.stop}
                          onChange={(value: number) => {
                            modifyLVisualizerSettings(
                              "fillRadialGradientStartRadius",
                              [visualizerSettingSelected.id],
                              { value }
                            );
                          }}
                        />
                        <ColorPickerComponent
                          color={stop.color}
                          onChange={(color: ColorResult) => {
                            if (
                              visualizerSettingSelected.visualizerSettings
                                ?.fillRadialGradientColorStops
                            ) {
                              let modifiedStops = [
                                ...visualizerSettingSelected.visualizerSettings
                                  ?.fillRadialGradientColorStops,
                              ];
                              modifiedStops[index].color = color.rgb;

                              modifyLVisualizerSettings(
                                "fillRadialGradientColorStops",
                                [visualizerSettingSelected.id],
                                modifiedStops
                              );
                            }
                          }}
                          label={""}
                        />
                      </View>
                    );
                  }
                )}
              </View>
            }
          />
          <CustomizationSettingRow
            label={"Fill start radius"}
            value={
              visualizerSettingSelected.visualizerSettings
                .fillRadialGradientStartRadius.value + ""
            }
            settingComponent={
              <Slider
                width={width - 20}
                step={0.1}
                minValue={0}
                maxValue={500}
                value={
                  visualizerSettingSelected.visualizerSettings
                    .fillRadialGradientStartRadius.value
                }
                onChange={(value: number) => {
                  modifyLVisualizerSettings(
                    "fillRadialGradientStartRadius",
                    [visualizerSettingSelected.id],
                    { value }
                  );
                }}
              />
            }
          />
          <View>
            <CustomizationSettingRow
              label={"Fill end radius"}
              value={
                visualizerSettingSelected.visualizerSettings
                  .fillRadialGradientEndRadius.value + ""
              }
              settingComponent={
                <Slider
                  width={width - 20}
                  step={0.05}
                  minValue={-1}
                  maxValue={5}
                  value={
                    visualizerSettingSelected.visualizerSettings
                      .fillRadialGradientEndRadius.value
                  }
                  onChange={(value: number) => {
                    if (visualizerSettingSelected.visualizerSettings) {
                      modifyLVisualizerSettings(
                        "fillRadialGradientEndRadius",
                        [visualizerSettingSelected.id],
                        {
                          value,
                          beatSyncIntensity:
                            visualizerSettingSelected.visualizerSettings
                              .fillRadialGradientEndRadius.beatSyncIntensity,
                        }
                      );
                    }
                  }}
                />
              }
            />
            <Flex marginStart={"20px"}>
              <Checkbox
                isSelected={
                  visualizerSettingSelected.visualizerSettings
                    .fillRadialGradientEndRadius.beatSyncIntensity !== 0
                }
                onChange={(isSelected) =>
                  handleBeatSyncIntensityEnableChange(
                    "fillRadialGradientEndRadius",
                    isSelected
                  )
                }
              ></Checkbox>
              <View
                UNSAFE_style={{
                  width: width - 40,
                  alignSelf: "flex-end",
                  opacity:
                    visualizerSettingSelected.visualizerSettings
                      .fillRadialGradientEndRadius.beatSyncIntensity === 0
                      ? 0.5
                      : 1,
                }}
              >
                <CustomizationSettingRow
                  label={"Fill end radius beat intensity"}
                  value={
                    visualizerSettingSelected.visualizerSettings
                      .fillRadialGradientEndRadius.beatSyncIntensity + ""
                  }
                  settingComponent={
                    <Slider
                      isDisabled={
                        visualizerSettingSelected.visualizerSettings
                          .fillRadialGradientEndRadius.beatSyncIntensity === 0
                      }
                      width={width - 70}
                      step={0.01}
                      minValue={0.01}
                      maxValue={5}
                      value={
                        visualizerSettingSelected.visualizerSettings
                          .fillRadialGradientEndRadius.beatSyncIntensity
                      }
                      onChange={(value: number) => {
                        if (visualizerSettingSelected.visualizerSettings) {
                          modifyLVisualizerSettings(
                            "fillRadialGradientEndRadius",
                            [visualizerSettingSelected.id],
                            {
                              value:
                                visualizerSettingSelected.visualizerSettings
                                  .fillRadialGradientEndRadius.value,
                              beatSyncIntensity: value,
                            }
                          );
                        }
                      }}
                    />
                  }
                />
              </View>
            </Flex>
          </View>
        </Flex>
      </View>
    );
  }

  return (
    <View
      UNSAFE_style={{
        fontStyle: "italic",
        color: "lightgray",
        opacity: 0.8,
      }}
    >
      No visualizer setting selected
    </View>
  );
}
