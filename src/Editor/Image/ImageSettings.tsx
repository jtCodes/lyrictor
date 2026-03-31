import { useEffect, useMemo, useState } from "react";
import { Flex, Item, Picker, View } from "@adobe/react-spectrum";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import {
  CustomizationSettingRow,
  ItemRenderSettingRow,
  ItemOpacitySettingRow,
} from "../AudioTimeline/Tools/CustomizationSettingRow";
import { TextCustomizationSettingType } from "../AudioTimeline/Tools/types";
import { EffectSlider } from "../Lyrics/Effects/EffectSlider";
import { ImageDanceMode } from "../types";

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
    return (
      <View
        UNSAFE_style={{
          fontStyle: "italic",
          color: "lightgray",
          opacity: 0.8,
        }}
        paddingStart={10}
      >
        No image selected
      </View>
    );
  }
  const swayMode = selectedImage.imageDanceMode ?? "line";

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <ItemRenderSettingRow selectedLyricText={selectedImage} />
        <ItemOpacitySettingRow selectedLyricText={selectedImage} />
        <PositionSettingRow
          label="X Offset"
          value={selectedImage.textX}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.textX}
          modifyLyricTexts={modifyLyricTexts}
        />
        <PositionSettingRow
          label="Y Offset"
          value={selectedImage.textY}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.textY}
          modifyLyricTexts={modifyLyricTexts}
        />
        <PositionSettingRow
          label="Size"
          value={selectedImage.imageScale ?? 1}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.imageScale}
          modifyLyricTexts={modifyLyricTexts}
          min={0.1}
          max={3}
          step={0.01}
        />
        <PositionSettingRow
          label="Sway amount"
          value={selectedImage.imageDanceAmount ?? 0}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.imageDanceAmount}
          modifyLyricTexts={modifyLyricTexts}
          min={0}
          max={0.2}
          step={0.005}
        />
        <PositionSettingRow
          label="Animation speed"
          value={selectedImage.imageDanceSpeed ?? 1}
          imageId={selectedImage.id}
          settingKey={TextCustomizationSettingType.imageDanceSpeed}
          modifyLyricTexts={modifyLyricTexts}
          min={0}
          max={4}
          step={0.05}
        />
        <CustomizationSettingRow
          label="Sway motion"
          value=""
          hideHeader={true}
          settingComponent={
            <Picker
              aria-label="Image sway motion"
              width="100%"
              selectedKey={swayMode}
              onSelectionChange={(key) => {
                if (!key) {
                  return;
                }

                modifyLyricTexts(
                  TextCustomizationSettingType.imageDanceMode,
                  [selectedImage.id],
                  key as ImageDanceMode
                );
              }}
            >
              <Item key="line">Straight line</Item>
              <Item key="wiper">Windshield wiper</Item>
            </Picker>
          }
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
  modifyLyricTexts,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string;
  value: number;
  imageId: number;
  settingKey: TextCustomizationSettingType;
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

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <CustomizationSettingRow
      label={label}
      value={max >= 10 ? localValue.toFixed(0) : localValue.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label={label}
          labelVariant="setting-row"
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
