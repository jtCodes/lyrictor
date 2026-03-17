import { useMemo, useState } from "react";
import { Flex, Slider, View } from "@adobe/react-spectrum";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { CustomizationSettingRow } from "../AudioTimeline/Tools/CustomizationSettingRow";
import { TextCustomizationSettingType } from "../AudioTimeline/Tools/types";

export default function ImageSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const selectedImage = useMemo(() => {
    if (selectedLyricTextIds.size === 1) {
      return lyricTexts.find(
        (lt) => lt.isImage && selectedLyricTextIds.has(lt.id)
      );
    }
  }, [lyricTexts, selectedLyricTextIds]);

  if (!selectedImage) {
    return null;
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <PositionSettingRow
          label="X Offset"
          value={selectedImage.textX}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.textX}
          width={width}
          modifyLyricTexts={modifyLyricTexts}
        />
        <PositionSettingRow
          label="Y Offset"
          value={selectedImage.textY}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.textY}
          width={width}
          modifyLyricTexts={modifyLyricTexts}
        />
        <PositionSettingRow
          label="Size"
          value={selectedImage.imageScale ?? 1}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.imageScale}
          width={width}
          modifyLyricTexts={modifyLyricTexts}
          min={0.1}
          max={3}
          step={0.01}
        />
      </Flex>
    </View>
  );
}

function PositionSettingRow({
  label,
  value,
  imageId,
  settingKey,
  width,
  modifyLyricTexts,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  imageId: number;
  settingKey: TextCustomizationSettingType;
  width: number;
  modifyLyricTexts: (
    type: TextCustomizationSettingType,
    ids: number[],
    value: any
  ) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [localValue, setLocalValue] = useState(value);

  return (
    <CustomizationSettingRow
      label={label}
      value={localValue.toFixed(2)}
      settingComponent={
        <Slider
          width={width - 20}
          minValue={min}
          maxValue={max}
          step={step}
          value={localValue}
          onChange={(v: number) => {
            setLocalValue(v);
            modifyLyricTexts(settingKey, [imageId], v);
          }}
        />
      }
    />
  );
}
