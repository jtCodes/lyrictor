import {
  ActionButton,
  Flex,
  Item,
  Picker,
  Text,
  View,
} from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import Close from "@spectrum-icons/workflow/Close";
import { ColorResult } from "react-color";
import {
  ColorPickerComponent,
  CustomizationSettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
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

function fieldTint(color: LightField["color"], alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export default function BaseLightSettings({
  settings,
  presetColors,
  onChange,
}: {
  settings: LightSettings;
  presetColors?: string[];
  onChange: UpdateLightSetting;
}) {
  function updateField(index: number, patch: Partial<LightField>) {
    onChange(
      "fields",
      settings.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function addField() {
    onChange("fields", [...settings.fields, createDefaultLightField()]);
  }

  function removeField(index: number) {
    onChange(
      "fields",
      settings.fields.filter((_, fieldIndex) => fieldIndex !== index)
    );
  }

  return (
    <CustomizationSettingRow
      label="Base lighting"
      value={settings.baseOpacity <= 0 ? "Off" : `${settings.fields.length} fields`}
      settingComponent={
        <Flex direction="column" gap="size-250">
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.62)",
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            This complete lighting setup is active whenever no keyframe override
            is running.
          </Text>

          <Flex direction="column" gap="size-150">
            <SectionLabel>Background</SectionLabel>
            <Picker
              aria-label="Light field blend mode"
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
            <Flex justifyContent="space-between" alignItems="center" gap="size-100">
              <Text>Background color</Text>
              <ActionButton
                onPress={() =>
                  onChange("baseOpacity", settings.baseOpacity > 0 ? 0 : 1)
                }
              >
                <Text>{settings.baseOpacity > 0 ? "Mute" : "Enable"}</Text>
              </ActionButton>
            </Flex>
            <ColorPickerComponent
              color={settings.baseColor}
              onChange={(color: ColorResult) => onChange("baseColor", color.rgb)}
              label="Light base color"
              presetColors={presetColors}
            />
            <BaseSlider
              label="Base opacity"
              value={settings.baseOpacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => onChange("baseOpacity", value)}
            />
            <BaseSlider
              label="Blur"
              value={settings.blur}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => onChange("blur", value)}
            />
          </Flex>

          <View
            height={1}
            UNSAFE_style={{ background: "rgba(255, 255, 255, 0.1)" }}
          />

          <Flex direction="column" gap="size-150">
            <Flex justifyContent="space-between" alignItems="center">
              <SectionLabel>Light fields</SectionLabel>
              <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.62)" }}>
                {settings.fields.length}
              </Text>
            </Flex>

            {settings.fields.length === 0 ? (
              <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.56)" }}>
                No light fields yet. Add one to start mixing colors.
              </Text>
            ) : null}

            {settings.fields.map((field, index) => (
              <View
                key={index}
                paddingX={12}
                paddingY={12}
                UNSAFE_style={{
                  background: fieldTint(
                    field.color,
                    Math.max(0.12, field.opacity * 0.2)
                  ),
                  boxShadow: `inset 0 0 0 1px ${fieldTint(
                    field.color,
                    Math.max(0.24, field.opacity * 0.34)
                  )}, inset 0 1px 0 rgba(255, 255, 255, 0.06)`,
                  borderRadius: 12,
                }}
              >
                <Flex direction="column" gap="size-150">
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    gap="size-100"
                  >
                    <SectionLabel>{`Field ${index + 1}`}</SectionLabel>
                    <Flex gap="size-100">
                      <ActionButton
                        onPress={() =>
                          updateField(index, {
                            opacity: field.opacity > 0 ? 0 : 0.35,
                          })
                        }
                      >
                        <Text>{field.opacity > 0 ? "Mute" : "Enable"}</Text>
                      </ActionButton>
                      <ActionButton
                        aria-label={`Remove field ${index + 1}`}
                        onPress={() => removeField(index)}
                      >
                        <Close />
                      </ActionButton>
                    </Flex>
                  </Flex>
                  <Flex direction="column" gap="size-100">
                    <Text>Color</Text>
                    <ColorPickerComponent
                      color={field.color}
                      onChange={(color: ColorResult) =>
                        updateField(index, { color: color.rgb })
                      }
                      label={`Field ${index + 1} color`}
                      presetColors={presetColors}
                    />
                  </Flex>
                  <BaseSlider
                    label="Horizontal position"
                    value={field.x}
                    min={-1}
                    max={2}
                    step={0.01}
                    onChange={(value) => updateField(index, { x: value })}
                  />
                  <BaseSlider
                    label="Vertical position"
                    value={field.y}
                    min={-1}
                    max={2}
                    step={0.01}
                    onChange={(value) => updateField(index, { y: value })}
                  />
                  <BaseSlider
                    label="Width"
                    value={field.radiusX}
                    min={0.05}
                    max={3.2}
                    step={0.01}
                    onChange={(value) =>
                      updateField(index, { radiusX: value })
                    }
                  />
                  <BaseSlider
                    label="Height"
                    value={field.radiusY}
                    min={0.05}
                    max={3.2}
                    step={0.01}
                    onChange={(value) =>
                      updateField(index, { radiusY: value })
                    }
                  />
                  <BaseSlider
                    label="Rotation"
                    value={field.rotation}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(value) =>
                      updateField(index, { rotation: value })
                    }
                  />
                  <BaseSlider
                    label="Opacity"
                    value={field.opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) =>
                      updateField(index, { opacity: value })
                    }
                  />
                  <BaseSlider
                    label="Motion amount"
                    value={field.motionAmount}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) =>
                      updateField(index, { motionAmount: value })
                    }
                  />
                </Flex>
              </View>
            ))}

            <ActionButton onPress={addField}>
              <AddCircle />
              <Text>Add field</Text>
            </ActionButton>
          </Flex>
        </Flex>
      }
    />
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      UNSAFE_style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255, 255, 255, 0.78)",
      }}
    >
      {children}
    </Text>
  );
}

function BaseSlider({
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
    <EffectSlider
      label={label}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={onChange}
    />
  );
}
