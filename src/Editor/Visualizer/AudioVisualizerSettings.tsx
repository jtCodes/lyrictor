import { useCallback, useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import {
  ActionButton,
  Checkbox,
  Flex,
  View,
} from "@adobe/react-spectrum";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import {
  ColorStop,
  normalizeVisualizerSetting,
  VisualizerSetting,
} from "./store";
import { ColorResult } from "react-color";
import Close from "@spectrum-icons/workflow/Close";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { Text } from "@adobe/react-spectrum";
import { extractProminentColors, rgbToHex } from "./colorExtractor";

export default function AudioVisualizerSettings({ width }: { width: number }) {
  const modifyLVisualizerSettings = useProjectStore(
    (state) => state.modifyVisualizerSettings
  );
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const editingProject = useProjectStore((state) => state.editingProject);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const [albumPresetColors, setAlbumPresetColors] = useState<string[]>();

  useEffect(() => {
    if (!editingProject?.albumArtSrc) {
      setAlbumPresetColors(undefined);
      return;
    }
    extractProminentColors(editingProject.albumArtSrc)
      .then((colors) => setAlbumPresetColors(colors.map(rgbToHex)))
      .catch(() => setAlbumPresetColors(undefined));
  }, [editingProject?.albumArtSrc, editingProject?.name]);

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
      const normalizedSettings = normalizeVisualizerSetting(
        visualizerSettingSelected.visualizerSettings
      );

      modifyLVisualizerSettings(key, [visualizerSettingSelected.id], {
        value: normalizedSettings.fillRadialGradientEndRadius.value,
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
    const visualizerSettings = normalizeVisualizerSetting(
      visualizerSettingSelected.visualizerSettings
    );

    return (
      <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
        <Flex direction={"column"} gap={"size-300"}>
          <CustomizationSettingRow
            label={"Color Stops"}
            value={""}
            settingComponent={
              <View marginTop={5}>
                <Flex direction={"column"} gap={5}>
                  {visualizerSettings.fillRadialGradientColorStops.map(
                    (stop, index) => {
                      return (
                        <View key={index}>
                          <Flex direction="column" gap={8}>
                            <Flex justifyContent="space-between" alignItems="center" gap={8}>
                              <View flex>
                                <Text>Stop {index + 1}</Text>
                              </View>
                              <Flex gap={"10px"} alignItems="center">
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
                                  label={`Color stop ${index + 1} color`}
                                  hideLabel
                                  presetColors={albumPresetColors}
                                />
                                <ActionButton
                                  aria-label="Delete color stop"
                                  onPressEnd={() => handleColorStopDelete(index)}
                                >
                                  <Close
                                    aria-label="Close"
                                    color="negative"
                                    size="XS"
                                  />
                                </ActionButton>
                              </Flex>
                            </Flex>
                            <EffectSlider
                              label={`Stop ${index + 1} position`}
                              labelVariant="setting-row"
                              minValue={0}
                              maxValue={1}
                              step={0.001}
                              value={stop.stop}
                              onChange={(value) => {
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
                          </Flex>
                          <View marginStart={12}>
                            <BeatIntensitySetting
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
                              label="Beat intensity"
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
                visualizerSettings.fillRadialGradientStartRadius.value + ""
            }
            hideHeader={true}
            settingComponent={
              <EffectSlider
                label="Fill start radius"
                labelVariant="setting-row"
                step={0.1}
                minValue={0}
                maxValue={500}
                value={visualizerSettings.fillRadialGradientStartRadius.value}
                onChange={(value: number) => {
                  modifyLVisualizerSettings(
                    "fillRadialGradientStartRadius",
                    [visualizerSettingSelected.id],
                    {
                      value,
                      beatSyncIntensity:
                        visualizerSettings.fillRadialGradientStartRadius
                          .beatSyncIntensity,
                    }
                  );
                }}
              />
            }
          />
          <View>
            <CustomizationSettingRow
              label={"Fill end radius"}
              value={
                visualizerSettings.fillRadialGradientEndRadius.value + ""
              }
              hideHeader={true}
              settingComponent={
                <EffectSlider
                  label="Fill end radius"
                  labelVariant="setting-row"
                  step={0.05}
                  minValue={-1}
                  maxValue={5}
                  value={visualizerSettings.fillRadialGradientEndRadius.value}
                  onChange={(value: number) => {
                    if (visualizerSettingSelected.visualizerSettings) {
                      modifyLVisualizerSettings(
                        "fillRadialGradientEndRadius",
                        [visualizerSettingSelected.id],
                        {
                          value,
                          beatSyncIntensity: visualizerSettings.fillRadialGradientEndRadius.beatSyncIntensity,
                        }
                      );
                    }
                  }}
                />
              }
            />
            <BeatIntensitySetting
              beatSyncIntensity={visualizerSettings.fillRadialGradientEndRadius.beatSyncIntensity}
              onIntensityChange={(value) => {
                if (visualizerSettingSelected.visualizerSettings) {
                  modifyLVisualizerSettings(
                    "fillRadialGradientEndRadius",
                    [visualizerSettingSelected.id],
                    {
                      value: visualizerSettings.fillRadialGradientEndRadius.value,
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
              label="Beat intensity"
            />
          </View>
          <CustomizationSettingRow
            label={"Blur"}
            value={visualizerSettings.blur.toFixed(2)}
            hideHeader={true}
            settingComponent={
              <EffectSlider
                label="Blur"
                labelVariant="setting-row"
                minValue={0}
                maxValue={1}
                step={0.05}
                value={visualizerSettings.blur}
                onChange={(value) => {
                  modifyLVisualizerSettings(
                    "blur",
                    [visualizerSettingSelected.id],
                    value
                  );
                }}
              />
            }
          />
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
  beatSyncIntensity: number;
  onIntensityChange: (value: number) => void;
  onSelectedChange: (isSelected: boolean) => void;
  label: string;
  step?: number;
  minValue?: number;
  maxValue?: number;
}

const BeatIntensitySetting: React.FC<BeatIntensitySettingProps> = ({
  beatSyncIntensity,
  onIntensityChange,
  onSelectedChange,
  label,
  step = 0.01,
  minValue = 0.01,
  maxValue = 5,
}) => {
  return (
    <Flex gap={"size-100"} alignItems="start" width="100%" UNSAFE_style={{ minWidth: 0 }}>
      <Checkbox
        isSelected={beatSyncIntensity !== 0}
        onChange={(isSelected) => onSelectedChange(isSelected)}
      />
      <View
        width="100%"
        UNSAFE_style={{
          flex: 1,
          minWidth: 0,
          opacity: beatSyncIntensity === 0 ? 0.5 : 1,
        }}
      >
        <EffectSlider
          label={label}
          labelVariant="setting-row"
          isDisabled={beatSyncIntensity === 0}
          step={step}
          minValue={minValue}
          maxValue={maxValue}
          value={beatSyncIntensity}
          onChange={(value: number) => {
            onIntensityChange(value);
          }}
        />
      </View>
    </Flex>
  );
};
