import {
  ActionButton,
  Flex,
  Item,
  Picker,
  Text,
} from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { useState } from "react";
import { ColorResult } from "react-color";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import SettingsHelpTooltip from "../AudioTimeline/Tools/SettingsHelpTooltip";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import LightFieldCard from "./LightFieldCard";
import {
  createDefaultLightField,
  LightBlendMode,
  LightField,
  LightSettings,
} from "./store";

type UpdateLightSetting = <T extends keyof LightSettings>(
  key: T,
  value: LightSettings[T]
) => void;

export default function BaseLightSettings({
  settings,
  presetColors,
  onChange,
}: {
  settings: LightSettings;
  presetColors?: string[];
  onChange: UpdateLightSetting;
}) {
  const [expandedFieldIndex, setExpandedFieldIndex] = useState<number>();

  function updateField(index: number, patch: Partial<LightField>) {
    onChange(
      "fields",
      settings.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function addField() {
    setExpandedFieldIndex(settings.fields.length);
    onChange("fields", [...settings.fields, createDefaultLightField()]);
  }

  function removeField(index: number) {
    onChange(
      "fields",
      settings.fields.filter((_, fieldIndex) => fieldIndex !== index)
    );
    setExpandedFieldIndex((currentIndex) => {
      if (currentIndex === undefined || currentIndex < index) {
        return currentIndex;
      }
      if (currentIndex === index) {
        return undefined;
      }
      return currentIndex - 1;
    });
  }

  return (
    <CustomizationSettingRow
      label="Base lighting"
      value={
        settings.baseOpacity <= 0 ? "Off" : `${settings.fields.length} fields`
      }
      headerAction={
        <SettingsHelpTooltip label="About base lighting">
          This complete lighting setup is active whenever no lighting override
          range is running.
        </SettingsHelpTooltip>
      }
      settingComponent={
        <Flex direction="column" gap="size-100">
          <SettingsSection label="Background">
            <Flex direction="column" gap="size-100">
              <Picker
                aria-label="Light field blend mode"
                label="Blend mode"
                width="100%"
                selectedKey={settings.blendMode}
                onSelectionChange={(key) => {
                  if (key) {
                    onChange("blendMode", key as LightBlendMode);
                  }
                }}
              >
                <Item key="normal">Normal blending</Item>
                <Item key="screen">Screen glow</Item>
                <Item key="soft-light">Soft light</Item>
              </Picker>
              <Flex justifyContent="space-between" alignItems="center">
                <Text>Background color</Text>
                <ActionButton
                  isQuiet
                  onPress={() =>
                    onChange("baseOpacity", settings.baseOpacity > 0 ? 0 : 1)
                  }
                >
                  <Text>{settings.baseOpacity > 0 ? "Mute" : "Enable"}</Text>
                </ActionButton>
              </Flex>
              <ColorPickerComponent
                color={settings.baseColor}
                onChange={(color: ColorResult) =>
                  onChange("baseColor", color.rgb)
                }
                label="Light base color"
                presetColors={presetColors}
              />
              <EffectSlider
                label="Base opacity"
                value={settings.baseOpacity}
                minValue={0}
                maxValue={1}
                step={0.01}
                onChange={(baseOpacity) =>
                  onChange("baseOpacity", baseOpacity)
                }
              />
              <EffectSlider
                label="Blur"
                value={settings.blur}
                minValue={0}
                maxValue={1}
                step={0.01}
                onChange={(blur) => onChange("blur", blur)}
              />
            </Flex>
          </SettingsSection>

          <SettingsSection
            label="Light fields"
            headerAction={
              <Text
                UNSAFE_style={{
                  color: "rgba(255, 255, 255, 0.58)",
                  fontSize: 10,
                }}
              >
                {settings.fields.length}
              </Text>
            }
          >
            <Flex direction="column" gap="size-100">
              {settings.fields.length === 0 ? (
                <Text
                  UNSAFE_style={{
                    color: "rgba(255, 255, 255, 0.54)",
                    fontSize: 11,
                  }}
                >
                  No light fields
                </Text>
              ) : null}
              {settings.fields.map((field, index) => (
                <LightFieldCard
                  key={index}
                  field={field}
                  index={index}
                  presetColors={presetColors}
                  isExpanded={expandedFieldIndex === index}
                  onToggle={() =>
                    setExpandedFieldIndex((currentIndex) =>
                      currentIndex === index ? undefined : index
                    )
                  }
                  onChange={(patch) => updateField(index, patch)}
                  onRemove={() => removeField(index)}
                />
              ))}
              <ActionButton onPress={addField}>
                <AddCircle />
                <Text>Add field</Text>
              </ActionButton>
            </Flex>
          </SettingsSection>
        </Flex>
      }
    />
  );
}
