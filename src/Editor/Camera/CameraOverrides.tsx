import { ActionButton, Flex, Text } from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { useState } from "react";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { getCurrentAudioPosition } from "../AudioTimeline/useAudioPosition";
import { LyricText } from "../types";
import { isItemRenderEnabled, isTextItem } from "../utils";
import CameraOverrideCard from "./CameraOverrideCard";
import CameraHelpTooltip from "./CameraHelpTooltip";
import {
  getCameraFocusCues,
  getCameraFocusTargetsById,
} from "./focusTarget";
import {
  createCameraOverride,
  resolveCameraSettingsAtPosition,
} from "./overrides";
import {
  CameraOverride,
  CameraSettings,
  normalizeCameraValues,
} from "./store";

const DEFAULT_TRANSITION_DURATION = 1;
const MINIMUM_TRANSITION_DURATION = 0.01;

function constrainOverride(
  cameraOverride: CameraOverride,
  itemDuration: number
) {
  const minimumDuration = Math.min(
    MINIMUM_TRANSITION_DURATION,
    itemDuration
  );
  const startOffset = Math.min(
    cameraOverride.startOffset,
    Math.max(0, itemDuration - minimumDuration)
  );

  return {
    ...cameraOverride,
    startOffset,
    endOffset: Math.min(
      itemDuration,
      Math.max(startOffset + minimumDuration, cameraOverride.endOffset)
    ),
  };
}

function getCoveredFocusTargets(
  cameraOverride: CameraOverride,
  camera: LyricText,
  lyricTexts: LyricText[]
) {
  const absoluteStart = camera.start + cameraOverride.startOffset;
  const absoluteEnd = camera.start + cameraOverride.endOffset;

  return lyricTexts
    .filter(
      (lyricText) =>
        lyricText.id !== camera.id &&
        isTextItem(lyricText) &&
        isItemRenderEnabled(lyricText) &&
        lyricText.text.trim().length > 0 &&
        lyricText.start <= absoluteEnd &&
        lyricText.end >= absoluteStart
    )
    .sort((left, right) => left.start - right.start || left.id - right.id);
}

export default function CameraOverrides({
  camera,
  lyricTexts,
  settings,
  onChange,
}: {
  camera: LyricText;
  lyricTexts: LyricText[];
  settings: CameraSettings;
  onChange: (overrides: CameraOverride[]) => void;
}) {
  const itemDuration = Math.max(0, camera.end - camera.start);
  const [expandedOverrideId, setExpandedOverrideId] = useState<string>();

  function updateOverride(id: string, patch: Partial<CameraOverride>) {
    onChange(
      settings.overrides
        .map((cameraOverride) => {
          if (cameraOverride.id !== id) {
            return cameraOverride;
          }

          const nextOverride = constrainOverride(
            { ...cameraOverride, ...patch },
            itemDuration
          );
          const focusTargetIsCovered = nextOverride.focusTargetId !== undefined
            ? getCoveredFocusTargets(
                nextOverride,
                camera,
                lyricTexts
              ).some(
                (lyricText) => lyricText.id === nextOverride.focusTargetId
              )
            : true;

          return focusTargetIsCovered
            ? nextOverride
            : { ...nextOverride, focusTargetId: undefined };
        })
        .sort(
          (left, right) =>
            left.startOffset - right.startOffset ||
            left.id.localeCompare(right.id)
        )
    );
  }

  function addOverride() {
    if (itemDuration <= 0) {
      return;
    }

    const currentPosition = getCurrentAudioPosition();
    const startOffset = Math.max(
      0,
      Math.min(
        itemDuration - Math.min(MINIMUM_TRANSITION_DURATION, itemDuration),
        currentPosition - camera.start
      )
    );
    const endOffset = Math.min(
      itemDuration,
      startOffset + DEFAULT_TRANSITION_DURATION
    );
    const snapshotPosition = camera.start + startOffset;
    const resolvedSettings = resolveCameraSettingsAtPosition(
      settings,
      getCameraFocusCues(lyricTexts),
      getCameraFocusTargetsById(lyricTexts),
      camera.start,
      snapshotPosition
    );
    const nextOverride = createCameraOverride(
      resolvedSettings,
      startOffset,
      endOffset
    );
    const existingIndex = settings.overrides.findIndex(
      (cameraOverride) =>
        Math.abs(cameraOverride.startOffset - startOffset) < 0.01
    );
    const nextOverrides = [...settings.overrides];

    if (existingIndex >= 0) {
      nextOverrides[existingIndex] = {
        ...nextOverride,
        id: nextOverrides[existingIndex].id,
        endOffset: nextOverrides[existingIndex].endOffset,
        focusTargetId: nextOverrides[existingIndex].focusTargetId,
        preOverride: nextOverrides[existingIndex].preOverride,
      };
    } else {
      nextOverrides.push(nextOverride);
    }

    const addedOverrideId =
      existingIndex >= 0
        ? nextOverrides[existingIndex].id
        : nextOverride.id;

    onChange(
      nextOverrides.sort(
        (left, right) =>
          left.startOffset - right.startOffset ||
          left.id.localeCompare(right.id)
      )
    );
    setExpandedOverrideId(addedOverrideId);
  }

  function addPreOverride(id: string) {
    const cameraOverride = settings.overrides.find(
      (override) => override.id === id
    );

    if (!cameraOverride) {
      return;
    }

    const positionImmediatelyBeforeStart = Math.max(
      camera.start,
      camera.start + cameraOverride.startOffset - 0.001
    );
    const resolvedSettings = resolveCameraSettingsAtPosition(
      settings,
      getCameraFocusCues(lyricTexts),
      getCameraFocusTargetsById(lyricTexts),
      camera.start,
      positionImmediatelyBeforeStart
    );

    updateOverride(id, {
      preOverride: normalizeCameraValues(resolvedSettings),
    });
  }

  function removeOverride(id: string) {
    onChange(
      settings.overrides.filter(
        (cameraOverride) => cameraOverride.id !== id
      )
    );

    if (expandedOverrideId === id) {
      setExpandedOverrideId(undefined);
    }
  }

  return (
    <CustomizationSettingRow
      label="Camera overrides"
      value={`${settings.overrides.length} transitions`}
      headerAction={
        <CameraHelpTooltip label="About camera overrides">
          The camera begins moving to the override at Start and reaches it at
          End. That state stays active until the next override. A selected
          focus target is held until the next override. Add a Pre-override for
          an explicit starting state.
        </CameraHelpTooltip>
      }
      settingComponent={
        <Flex direction="column" gap="size-150">
          {settings.overrides.map((cameraOverride, index) => (
            <CameraOverrideCard
              key={cameraOverride.id}
              cameraOverride={constrainOverride(
                cameraOverride,
                itemDuration
              )}
              index={index}
              itemDuration={itemDuration}
              focusCandidates={getCoveredFocusTargets(
                constrainOverride(cameraOverride, itemDuration),
                camera,
                lyricTexts
              )}
              isExpanded={expandedOverrideId === cameraOverride.id}
              onToggle={() =>
                setExpandedOverrideId((currentId) =>
                  currentId === cameraOverride.id
                    ? undefined
                    : cameraOverride.id
                )
              }
              onChange={(patch) =>
                updateOverride(cameraOverride.id, patch)
              }
              onRemove={() => removeOverride(cameraOverride.id)}
              onAddPreOverride={() => addPreOverride(cameraOverride.id)}
            />
          ))}
          <ActionButton onPress={addOverride}>
            <AddCircle />
            <Text>Add override at playhead</Text>
          </ActionButton>
        </Flex>
      }
    />
  );
}
