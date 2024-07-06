import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import {
  ActionButton,
  Checkbox,
  Flex,
  Slider,
  View,
} from "@adobe/react-spectrum";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { ColorStop, VisualizerSetting } from "./store";
import { ColorResult } from "react-color";
import Close from "@spectrum-icons/workflow/Close";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { Text } from "@adobe/react-spectrum";

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

  function handleFillEndRadiusBeatSyncIntensityEnableChange(
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

  function handleColorStopDelete(index: number) {
    if (
      visualizerSettingSelected &&
      visualizerSettingSelected.visualizerSettings?.fillRadialGradientColorStops
    ) {
      // Create a shallow copy of the array
      let modifiedStops = [
        ...visualizerSettingSelected.visualizerSettings
          .fillRadialGradientColorStops,
      ];

      // Remove the element at the specified index
      if (index > -1 && index < modifiedStops.length) {
        modifiedStops.splice(index, 1);
      }

      // Update the settings with the modified array
      modifyLVisualizerSettings(
        "fillRadialGradientColorStops",
        [visualizerSettingSelected.id],
        modifiedStops
      );
    }
  }

  function handleAddStop() {
    if (
      visualizerSettingSelected &&
      visualizerSettingSelected.visualizerSettings?.fillRadialGradientColorStops
    ) {
      let modifiedStops = [
        ...visualizerSettingSelected.visualizerSettings
          .fillRadialGradientColorStops,
      ];

      const newStop: ColorStop = {
        stop: 0.5,
        color: { r: 186, g: 255, b: 255, a: 1 },
        beatSyncIntensity: 0,
      };
      modifiedStops.push(newStop);

      modifyLVisualizerSettings(
        "fillRadialGradientColorStops",
        [visualizerSettingSelected.id],
        modifiedStops
      );
    }
  }

  if (
    visualizerSettingSelected &&
    visualizerSettingSelected.visualizerSettings
  ) {
    return (
      <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
        <Flex direction={"column"} gap={"size-300"}>
          <CustomizationSettingRow
            label={"Color Stops"}
            value={""}
            settingComponent={
              <View marginTop={5}>
                <Flex direction={"column"} gap={5}>
                  {visualizerSettingSelected.visualizerSettings.fillRadialGradientColorStops.map(
                    (stop, index) => {
                      return (
                        <View>
                          <Flex gap={"10px"}>
                            <ActionButton
                              onPressEnd={() => handleColorStopDelete(index)}
                            >
                              <Close
                                aria-label="Close"
                                color="negative"
                                size="XS"
                              />
                            </ActionButton>
                            <Slider
                              width={width - 140}
                              step={0.001}
                              minValue={0}
                              maxValue={1}
                              value={stop.stop}
                              onChange={(value: number) => {
                                if (
                                  visualizerSettingSelected.visualizerSettings
                                    ?.fillRadialGradientColorStops
                                ) {
                                  let modifiedStops = [
                                    ...visualizerSettingSelected
                                      .visualizerSettings
                                      ?.fillRadialGradientColorStops,
                                  ];
                                  modifiedStops[index].stop = value;

                                  modifyLVisualizerSettings(
                                    "fillRadialGradientColorStops",
                                    [visualizerSettingSelected.id],
                                    modifiedStops
                                  );
                                }
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
                                    ...visualizerSettingSelected
                                      .visualizerSettings
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
                              hideLabel
                            />
                          </Flex>
                          <View marginStart={30}>
                            <BeatIntensitySetting
                              width={width - 50}
                              step={0.001}
                              minValue={0.1}
                              maxValue={1.5}
                              beatSyncIntensity={stop.beatSyncIntensity}
                              onIntensityChange={(value) => {
                                if (
                                  visualizerSettingSelected.visualizerSettings
                                    ?.fillRadialGradientColorStops
                                ) {
                                  let modifiedStops = [
                                    ...visualizerSettingSelected
                                      .visualizerSettings
                                      ?.fillRadialGradientColorStops,
                                  ];
                                  modifiedStops[index].beatSyncIntensity =
                                    value;

                                  modifyLVisualizerSettings(
                                    "fillRadialGradientColorStops",
                                    [visualizerSettingSelected.id],
                                    modifiedStops
                                  );
                                }
                              }}
                              onSelectedChange={(isSelected) => {
                                if (
                                  visualizerSettingSelected.visualizerSettings
                                    ?.fillRadialGradientColorStops
                                ) {
                                  let modifiedStops = [
                                    ...visualizerSettingSelected
                                      .visualizerSettings
                                      ?.fillRadialGradientColorStops,
                                  ];
                                  modifiedStops[index].beatSyncIntensity =
                                    isSelected ? 1 : 0;

                                  modifyLVisualizerSettings(
                                    "fillRadialGradientColorStops",
                                    [visualizerSettingSelected.id],
                                    modifiedStops
                                  );
                                }
                              }}
                              label="Color opacity beat intensity"
                            />
                          </View>
                        </View>
                      );
                    }
                  )}
                  <ActionButton onPressEnd={handleAddStop}>
                    <AddCircle />
                    <Text>Add stop</Text>
                  </ActionButton>
                </Flex>
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
            <BeatIntensitySetting
              width={width}
              beatSyncIntensity={
                visualizerSettingSelected.visualizerSettings
                  .fillRadialGradientEndRadius.beatSyncIntensity
              }
              onIntensityChange={(value) => {
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
              onSelectedChange={(isSelected) =>
                handleFillEndRadiusBeatSyncIntensityEnableChange(
                  "fillRadialGradientEndRadius",
                  isSelected
                )
              }
              label="Fill end radius beat intensity"
            />
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

interface BeatIntensitySettingProps {
  width: number;
  beatSyncIntensity: number;
  onIntensityChange: (value: number) => void;
  onSelectedChange: (isSelected: boolean) => void;
  label: string;
  step?: number;
  minValue?: number;
  maxValue?: number;
}

const BeatIntensitySetting: React.FC<BeatIntensitySettingProps> = ({
  width,
  beatSyncIntensity,
  onIntensityChange,
  onSelectedChange,
  label,
  step = 0.01,
  minValue = 0.01,
  maxValue = 5,
}) => {
  return (
    <Flex marginStart={"20px"}>
      <Checkbox
        isSelected={beatSyncIntensity !== 0}
        onChange={(isSelected) => onSelectedChange(isSelected)}
      />
      <View
        UNSAFE_style={{
          width: width - 40,
          alignSelf: "flex-end",
          opacity: beatSyncIntensity === 0 ? 0.5 : 1,
        }}
      >
        <CustomizationSettingRow
          label={label}
          value={beatSyncIntensity + ""}
          settingComponent={
            <Slider
              isDisabled={beatSyncIntensity === 0}
              width={width - 70}
              step={step}
              minValue={minValue}
              maxValue={maxValue}
              value={beatSyncIntensity}
              onChange={(value: number) => {
                onIntensityChange(value);
              }}
            />
          }
        />
      </View>
    </Flex>
  );
};
