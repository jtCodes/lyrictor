import {
  ActionButton,
  Flex,
  Item,
  Picker,
  Text,
  View,
} from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import ChevronRight from "@spectrum-icons/workflow/ChevronRight";
import Close from "@spectrum-icons/workflow/Close";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import SettingsSection from "../AudioTimeline/Tools/SettingsSection";
import { LyricText } from "../types";
import CameraPreOverrideSettings from "./CameraPreOverrideSettings";
import {
  CameraOverride,
  normalizeCameraZPosition,
} from "./store";

const COMPACT_BUTTON_STYLE = {
  width: 26,
  minWidth: 26,
  height: 26,
  minHeight: 26,
  padding: 0,
};

export default function CameraOverrideCard({
  cameraOverride,
  index,
  itemDuration,
  focusCandidates,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  onAddPreOverride,
}: {
  cameraOverride: CameraOverride;
  index: number;
  itemDuration: number;
  focusCandidates: LyricText[];
  isExpanded: boolean;
  onToggle: () => void;
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
  const focusSummary = focusTarget
    ? focusTargetLabel(focusTarget.text)
    : `Focus ${Math.round(cameraOverride.focusDistance * 100)}`;

  return (
    <View
      paddingX={10}
      paddingY={8}
      UNSAFE_style={{
        background: isExpanded
          ? "rgba(255, 255, 255, 0.045)"
          : "rgba(255, 255, 255, 0.025)",
        boxShadow: `inset 0 0 0 1px ${
          isExpanded
            ? "rgba(255, 255, 255, 0.105)"
            : "rgba(255, 255, 255, 0.065)"
        }`,
        borderRadius: 10,
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex alignItems="center" gap="size-75">
          <ActionButton
            isQuiet
            aria-label={`${isExpanded ? "Collapse" : "Expand"} override ${
              index + 1
            }`}
            onPress={onToggle}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </ActionButton>
          <Flex
            direction="column"
            gap="size-25"
            flex="1"
            UNSAFE_style={{ minWidth: 0 }}
          >
            <Flex justifyContent="space-between" alignItems="center" gap="size-75">
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {`Override ${index + 1}`}
              </span>
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.66)",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                {`${cameraOverride.startOffset.toFixed(
                  2
                )}–${cameraOverride.endOffset.toFixed(2)}s`}
              </span>
            </Flex>
            <span
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`${Math.round(cameraOverride.focalLength)}mm · ${Math.round(
                cameraOverride.rotation
              )}° · ${focusSummary}${
                cameraOverride.preOverride ? " · Pre" : ""
              }`}
            </span>
          </Flex>
          <ActionButton
            isQuiet
            aria-label={`Remove camera override ${index + 1}`}
            onPress={onRemove}
            UNSAFE_style={COMPACT_BUTTON_STYLE}
          >
            <Close />
          </ActionButton>
        </Flex>

        {isExpanded ? (
          <Flex direction="column" gap="size-100">
            <SettingsSection label="Transition timing">
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Start time"
                  value={cameraOverride.startOffset}
                  minValue={0}
                  maxValue={Math.max(0, cameraOverride.endOffset - 0.01)}
                  step={0.01}
                  onChange={(startOffset) => onChange({ startOffset })}
                />
                <EffectSlider
                  label="End time"
                  value={cameraOverride.endOffset}
                  minValue={Math.min(
                    itemDuration,
                    cameraOverride.startOffset + 0.01
                  )}
                  maxValue={Math.max(itemDuration, 0.01)}
                  step={0.01}
                  onChange={(endOffset) => onChange({ endOffset })}
                />
              </Flex>
            </SettingsSection>

            {cameraOverride.preOverride ? (
              <CameraPreOverrideSettings
                values={cameraOverride.preOverride}
                onChange={(preOverride) => onChange({ preOverride })}
                onRemove={() => onChange({ preOverride: undefined })}
              />
            ) : (
              <ActionButton isQuiet onPress={onAddPreOverride}>
                <AddCircle />
                <Text>Add pre-override state</Text>
              </ActionButton>
            )}

            <SettingsSection label="Destination camera">
              <Flex direction="column" gap="size-100">
                <EffectSlider
                  label="Focal length"
                  value={cameraOverride.focalLength}
                  minValue={18}
                  maxValue={200}
                  step={1}
                  onChange={(focalLength) => onChange({ focalLength })}
                />
                <EffectSlider
                  label="Camera rotation"
                  value={cameraOverride.rotation}
                  minValue={-180}
                  maxValue={180}
                  step={1}
                  onChange={(rotation) => onChange({ rotation })}
                />
              </Flex>
            </SettingsSection>

            <SettingsSection label="Focus">
              <Flex direction="column" gap="size-100">
                <Picker
                  aria-label={`Override ${index + 1} focus target`}
                  label="Keep focus on"
                  width="100%"
                  items={focusOptions}
                  selectedKey={
                    focusTarget ? String(focusTarget.id) : "manual"
                  }
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
                {focusTarget ? (
                  <Text
                    UNSAFE_style={{
                      color: "rgba(255, 255, 255, 0.56)",
                      fontSize: 10,
                    }}
                  >
                    {`Locked at Z ${Math.round(
                      normalizeCameraZPosition(
                        focusTarget.cameraZPosition ?? focusTarget.cameraDepth
                      ) * 100
                    )} until the next override`}
                  </Text>
                ) : null}
                {!focusTarget ? (
                  <EffectSlider
                    label="Focus distance"
                    value={cameraOverride.focusDistance * 100}
                    minValue={0}
                    maxValue={100}
                    step={1}
                    onChange={(focusDistance) =>
                      onChange({ focusDistance: focusDistance / 100 })
                    }
                  />
                ) : null}
                <EffectSlider
                  label="Focus speed (slow → fast)"
                  value={cameraOverride.focusChangeSpeed}
                  minValue={0}
                  maxValue={100}
                  step={1}
                  onChange={(focusChangeSpeed) =>
                    onChange({ focusChangeSpeed })
                  }
                />
              </Flex>
            </SettingsSection>
          </Flex>
        ) : null}
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
