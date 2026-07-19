import {
  ActionButton,
  Flex,
  Item,
  Picker,
  Text,
  View,
} from "@adobe/react-spectrum";
import Close from "@spectrum-icons/workflow/Close";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { LyricText } from "../types";
import {
  CameraOverride,
  normalizeCameraZPosition,
} from "./store";
import CameraPreOverrideSettings from "./CameraPreOverrideSettings";

export default function CameraOverrideCard({
  cameraOverride,
  index,
  itemDuration,
  focusCandidates,
  onChange,
  onRemove,
  onAddPreOverride,
}: {
  cameraOverride: CameraOverride;
  index: number;
  itemDuration: number;
  focusCandidates: LyricText[];
  onChange: (patch: Partial<CameraOverride>) => void;
  onRemove: () => void;
  onAddPreOverride: () => void;
}) {
  const focusTarget = focusCandidates.find(
    (lyricText) => lyricText.id === cameraOverride.focusTargetId
  );
  const focusOptions = [
    { id: "manual", label: "Manual distance" },
    ...focusCandidates.map((lyricText) => ({
      id: String(lyricText.id),
      label: `${focusTargetLabel(lyricText.text)} · ${lyricText.start.toFixed(
        2
      )}s`,
    })),
  ];

  return (
    <View
      paddingX={12}
      paddingY={12}
      UNSAFE_style={{
        background: "rgba(255, 255, 255, 0.035)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
      }}
    >
      <Flex direction="column" gap="size-150">
        <Flex justifyContent="space-between" alignItems="center" gap="size-100">
          <Flex direction="column" gap="size-50">
            <Text>{`Override ${index + 1}`}</Text>
            <Text
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.62)",
                fontSize: 11,
              }}
            >
              {`${cameraOverride.startOffset.toFixed(
                2
              )}–${cameraOverride.endOffset.toFixed(2)}s transition`}
            </Text>
          </Flex>
          <ActionButton
            aria-label={`Remove camera override ${index + 1}`}
            onPress={onRemove}
          >
            <Close />
          </ActionButton>
        </Flex>

        <CameraSlider
          label="Start time"
          value={cameraOverride.startOffset}
          min={0}
          max={Math.max(0, cameraOverride.endOffset - 0.01)}
          step={0.01}
          displayValue={cameraOverride.startOffset.toFixed(2)}
          onChange={(startOffset) => onChange({ startOffset })}
        />
        <CameraSlider
          label="End time"
          value={cameraOverride.endOffset}
          min={Math.min(itemDuration, cameraOverride.startOffset + 0.01)}
          max={Math.max(itemDuration, 0.01)}
          step={0.01}
          displayValue={cameraOverride.endOffset.toFixed(2)}
          onChange={(endOffset) => onChange({ endOffset })}
        />

        {cameraOverride.preOverride ? (
          <CameraPreOverrideSettings
            values={cameraOverride.preOverride}
            onChange={(preOverride) => onChange({ preOverride })}
            onRemove={() => onChange({ preOverride: undefined })}
          />
        ) : (
          <ActionButton isQuiet onPress={onAddPreOverride}>
            <AddCircle />
            <Text>Add pre-override starting state</Text>
          </ActionButton>
        )}

        <Flex direction="column" gap="size-100">
          <Picker
            aria-label={`Override ${index + 1} focus target`}
            label="Keep focus on"
            width="100%"
            items={focusOptions}
            selectedKey={focusTarget ? String(focusTarget.id) : "manual"}
            onSelectionChange={(key) => {
              if (key === "manual") {
                onChange({ focusTargetId: undefined });
                return;
              }

              const selectedTarget = focusCandidates.find(
                (lyricText) => String(lyricText.id) === String(key)
              );

              if (selectedTarget) {
                onChange({
                  focusTargetId: selectedTarget.id,
                  focusDistance: normalizeCameraZPosition(
                    selectedTarget.cameraZPosition ??
                      selectedTarget.cameraDepth
                  ),
                });
              }
            }}
          >
            {(option) => <Item key={option.id}>{option.label}</Item>}
          </Picker>
          <Text
            UNSAFE_style={{
              color: "rgba(255, 255, 255, 0.62)",
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            {focusTarget
              ? `Uses this item's Z ${Math.round(
                  normalizeCameraZPosition(
                    focusTarget.cameraZPosition ?? focusTarget.cameraDepth
                  ) * 100
                )} and holds focus until the next override.`
              : focusCandidates.length > 0
                ? "Choose a text item visible during this transition, or set the distance manually."
                : "No text items overlap this transition."}
          </Text>
        </Flex>

        <CameraSlider
          label="Focal length"
          value={cameraOverride.focalLength}
          min={18}
          max={200}
          step={1}
          displayValue={`${Math.round(cameraOverride.focalLength)}mm`}
          onChange={(focalLength) => onChange({ focalLength })}
        />
        <CameraSlider
          label="Camera rotation"
          value={cameraOverride.rotation}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(cameraOverride.rotation)}°`}
          onChange={(rotation) => onChange({ rotation })}
        />
        {!focusTarget ? (
          <CameraSlider
            label="Focus distance"
            value={cameraOverride.focusDistance * 100}
            min={0}
            max={100}
            step={1}
            displayValue={`${Math.round(
              cameraOverride.focusDistance * 100
            )}`}
            onChange={(focusDistance) =>
              onChange({ focusDistance: focusDistance / 100 })
            }
          />
        ) : null}
        <CameraSlider
          label="Focus change speed"
          value={cameraOverride.focusChangeSpeed}
          min={0}
          max={100}
          step={1}
          displayValue={`${Math.round(cameraOverride.focusChangeSpeed)}`}
          onChange={(focusChangeSpeed) => onChange({ focusChangeSpeed })}
        />
      </Flex>
    </View>
  );
}

function focusTargetLabel(text: string) {
  const singleLineText = text.replace(/\s+/g, " ").trim();

  return singleLineText.length > 32
    ? `${singleLineText.slice(0, 29)}…`
    : singleLineText;
}

function CameraSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <CustomizationSettingRow
      label={label}
      value={displayValue}
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
