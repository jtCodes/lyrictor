import { Flex, Text, View } from "@adobe/react-spectrum";
import { useMemo } from "react";
import { useProjectStore } from "../../Project/store";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { useEditorStore } from "../store";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import {
  GrainSettings as GrainSettingsType,
  normalizeGrainSettings,
} from "./store";

type GrainSettingKey = keyof GrainSettingsType;

export default function GrainSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyGrainSettings = useProjectStore((state) => state.modifyGrainSettings);
  const selectedLyricTextIds = useEditorStore((state) => state.selectedLyricTextIds);

  const selectedGrain = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find(
      (lyricText) => lyricText.isGrain && selectedLyricTextIds.has(lyricText.id)
    );
  }, [lyricTexts, selectedLyricTextIds]);

  const settings = useMemo(
    () => normalizeGrainSettings(selectedGrain?.grainSettings),
    [selectedGrain?.grainSettings]
  );

  function updateSetting<T extends GrainSettingKey>(
    key: T,
    value: GrainSettingsType[T]
  ) {
    if (!selectedGrain) {
      return;
    }

    modifyGrainSettings(key, [selectedGrain.id], value);
  }

  if (!selectedGrain) {
    return (
      <View
        UNSAFE_style={{
          fontStyle: "italic",
          color: "lightgray",
          opacity: 0.8,
        }}
        paddingStart={10}
      >
        No grain element selected
      </View>
    );
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <CustomizationSettingRow
          label="Profile"
          value="Film"
          settingComponent={
            <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.58)", lineHeight: 1.5 }}>
              Low-cost monochrome grain with separate dark and bright speck control, plus a resolution slider when you want finer noise.
            </Text>
          }
        />
        <GrainSliderRow
          label="Intensity"
          value={settings.intensity}
          min={0}
          max={4}
          step={0.01}
          onChange={(value) => updateSetting("intensity", value)}
        />
        <GrainSliderRow
          label="Grain size"
          value={settings.size}
          min={0.35}
          max={4.5}
          step={0.01}
          onChange={(value) => updateSetting("size", value)}
        />
        <GrainSliderRow
          label="Resolution"
          value={settings.resolution}
          min={0.5}
          max={3}
          step={0.01}
          onChange={(value) => updateSetting("resolution", value)}
        />
        <GrainSliderRow
          label="Refresh"
          value={settings.speed}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateSetting("speed", value)}
        />
        <GrainSliderRow
          label="Contrast"
          value={settings.contrast}
          min={0.4}
          max={4}
          step={0.01}
          onChange={(value) => updateSetting("contrast", value)}
        />
        <GrainSliderRow
          label="Shadow grain"
          value={settings.shadowAmount}
          min={0}
          max={1.5}
          step={0.01}
          onChange={(value) => updateSetting("shadowAmount", value)}
        />
        <GrainSliderRow
          label="Highlight grain"
          value={settings.highlightAmount}
          min={0}
          max={1.5}
          step={0.01}
          onChange={(value) => updateSetting("highlightAmount", value)}
        />
      </Flex>
    </View>
  );
}

function GrainSliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <CustomizationSettingRow
      label={label}
      value={value.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label={label}
          labelVariant="setting-row"
          minValue={min}
          maxValue={max}
          step={step}
          value={value}
          onChange={onChange}
        />
      }
    />
  );
}