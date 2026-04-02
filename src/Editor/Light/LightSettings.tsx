import { ActionButton, Flex, Text, View } from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import { ColorResult } from "react-color";
import { useProjectStore } from "../../Project/store";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { useEditorStore } from "../store";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { extractProminentColors, rgbToHex } from "../Visualizer/colorExtractor";
import { LightField, LightSettings as LightSettingsType, normalizeLightSettings } from "./store";

type LightSettingKey = keyof LightSettingsType;

export default function LightSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const editingProject = useProjectStore((state) => state.editingProject);
  const modifyLightSettings = useProjectStore((state) => state.modifyLightSettings);
  const selectedLyricTextIds = useEditorStore((state) => state.selectedLyricTextIds);
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

  const selectedLight = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find(
      (lyricText) => lyricText.isLight && selectedLyricTextIds.has(lyricText.id)
    );
  }, [lyricTexts, selectedLyricTextIds]);

  const settings = useMemo(
    () => normalizeLightSettings(selectedLight?.lightSettings),
    [selectedLight?.lightSettings]
  );

  function updateSetting<T extends LightSettingKey>(
    key: T,
    value: LightSettingsType[T]
  ) {
    if (!selectedLight) {
      return;
    }

    modifyLightSettings(key, [selectedLight.id], value);
  }

  function updateField(index: number, patch: Partial<LightField>) {
    const nextFields = settings.fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field
    );
    updateSetting("fields", nextFields);
  }

  if (!selectedLight) {
    return (
      <View
        UNSAFE_style={{
          fontStyle: "italic",
          color: "lightgray",
          opacity: 0.8,
        }}
        paddingStart={10}
      >
        No light element selected
      </View>
    );
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <CustomizationSettingRow
          label="Base color"
          value=""
          hideHeader={true}
          settingComponent={
            <ColorPickerComponent
              color={settings.baseColor}
              onChange={(color: ColorResult) => updateSetting("baseColor", color.rgb)}
              label="Light base color"
              presetColors={albumPresetColors}
            />
          }
        />
        <LightSliderRow
          label="Blur"
          value={settings.blur}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateSetting("blur", value)}
        />
        {settings.fields.map((field, index) => (
          <View key={index}>
            <CustomizationSettingRow
              label={`Field ${index + 1}`}
              value={field.opacity.toFixed(2)}
              settingComponent={
                <Flex direction="column" gap="size-125">
                  <Flex justifyContent="space-between" alignItems="center" gap="size-100">
                    <Text>Color</Text>
                    <ActionButton
                      onPress={() => updateField(index, { opacity: field.opacity > 0 ? 0 : 0.35 })}
                    >
                      <Text>{field.opacity > 0 ? "Mute" : "Enable"}</Text>
                    </ActionButton>
                  </Flex>
                  <ColorPickerComponent
                    color={field.color}
                    onChange={(color: ColorResult) => updateField(index, { color: color.rgb })}
                    label={`Field ${index + 1} color`}
                    presetColors={albumPresetColors}
                  />
                </Flex>
              }
            />
            <LightSliderRow
              label="Horizontal position"
              value={field.x}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateField(index, { x: value })}
            />
            <LightSliderRow
              label="Vertical position"
              value={field.y}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateField(index, { y: value })}
            />
            <LightSliderRow
              label="Width"
              value={field.radiusX}
              min={0.05}
              max={1.2}
              step={0.01}
              onChange={(value) => updateField(index, { radiusX: value })}
            />
            <LightSliderRow
              label="Height"
              value={field.radiusY}
              min={0.05}
              max={1.2}
              step={0.01}
              onChange={(value) => updateField(index, { radiusY: value })}
            />
            <LightSliderRow
              label="Rotation"
              value={field.rotation}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => updateField(index, { rotation: value })}
            />
            <LightSliderRow
              label="Opacity"
              value={field.opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateField(index, { opacity: value })}
            />
          </View>
        ))}
      </Flex>
    </View>
  );
}

function LightSliderRow({
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
      value={value.toFixed(label === "Rotation" ? 0 : 2)}
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