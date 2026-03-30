import { useEffect, useMemo, useState } from "react";
import { Flex, View } from "@adobe/react-spectrum";
import { ColorResult } from "react-color";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { BeatIntensitySetting } from "../Visualizer/AudioVisualizerSettings";
import ParticleMotionPad from "./ParticleMotionPad";
import { normalizeParticleSettings, ParticleSettings } from "./store";

type ParticleSettingKey = keyof ParticleSettings;

export default function ParticlesSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyParticleSettings = useProjectStore(
    (state) => state.modifyParticleSettings
  );
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const selectedParticle = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find(
      (lyricText) => lyricText.isParticle && selectedLyricTextIds.has(lyricText.id)
    );
  }, [lyricTexts, selectedLyricTextIds]);

  const settings = useMemo(
    () => normalizeParticleSettings(selectedParticle?.particleSettings),
    [selectedParticle?.particleSettings]
  );

  function updateSetting<T extends ParticleSettingKey>(
    key: T,
    value: ParticleSettings[T]
  ) {
    if (!selectedParticle) {
      return;
    }

    modifyParticleSettings(key, [selectedParticle.id], value);
  }

  if (!selectedParticle) {
    return (
      <View
        UNSAFE_style={{
          fontStyle: "italic",
          color: "lightgray",
          opacity: 0.8,
        }}
        paddingStart={10}
      >
        No particle element selected
      </View>
    );
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <ParticleSliderRow
          label="Count"
          value={settings.count}
          min={8}
          max={96}
          step={1}
          onChange={(value) => updateSetting("count", Math.round(value))}
        />
        <ParticleSliderRow
          label="Size"
          value={settings.size}
          min={0.002}
          max={0.03}
          step={0.001}
          onChange={(value) => updateSetting("size", value)}
        />
        <ParticleSliderRow
          label="Speed"
          value={settings.speed}
          min={0.05}
          max={1}
          step={0.01}
          onChange={(value) => updateSetting("speed", value)}
        />
        <CustomizationSettingRow
          label="Movement"
          value=""
          hideHeader={true}
          settingComponent={
            <ParticleMotionPad
              x={settings.travelVectorX}
              y={settings.travelVectorY}
              onChange={({ x, y }) => {
                updateSetting("travelVectorX", x);
                updateSetting("travelVectorY", y);
              }}
            />
          }
        />
        <ParticleSliderRow
          label="Particle Opacity"
          value={settings.opacity}
          min={0.05}
          max={1}
          step={0.01}
          onChange={(value) => updateSetting("opacity", value)}
        />
        <ParticleSliderRow
          label="Spread"
          value={settings.spread}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateSetting("spread", value)}
        />
        <CustomizationSettingRow
          label="Color"
          value=""
          hideHeader={true}
          settingComponent={
            <ColorPickerComponent
              color={settings.color}
              onChange={(color: ColorResult) => updateSetting("color", color.rgb)}
              label="Particle color"
            />
          }
        />
        <CustomizationSettingRow
          label="Beat reactive"
          value={settings.beatReactiveIntensity.toFixed(2)}
          hideHeader={true}
          settingComponent={
            <BeatIntensitySetting
              beatSyncIntensity={settings.beatReactiveIntensity}
              onIntensityChange={(value) => updateSetting("beatReactiveIntensity", value)}
              onSelectedChange={(isSelected) =>
                updateSetting("beatReactiveIntensity", isSelected ? 1 : 0)
              }
              label="Beat intensity"
            />
          }
        />
      </Flex>
    </View>
  );
}

function ParticleSliderRow({
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
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <CustomizationSettingRow
      label={label}
      value={localValue.toFixed(label === "Count" ? 0 : 2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label={label}
          labelVariant="setting-row"
          minValue={min}
          maxValue={max}
          step={step}
          value={localValue}
          onChange={(nextValue: number) => {
            setLocalValue(nextValue);
            onChange(nextValue);
          }}
        />
      }
    />
  );
}
