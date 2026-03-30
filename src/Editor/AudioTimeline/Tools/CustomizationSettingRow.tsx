import {
  View,
  Text,
  Flex,
  Picker,
  Item,
  TextArea,
  Button,
  Switch,
} from "@adobe/react-spectrum";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import { useEffect, useRef, useState, useMemo } from "react";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { getCenteredTextPosition } from "../../Lyrics/LyricPreview/textCentering";
import {
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../types";
import { EffectSlider } from "../../Lyrics/Effects/EffectSlider";
import { CUSTOMIZATION_PANEL_WIDTH } from "./LyricTextCustomizationToolPanel";
import { TextCustomizationSettingType } from "./types";
import OutsideClickHandler_ from "react-outside-click-handler";
const OutsideClickHandler = OutsideClickHandler_ as any;

export function TextReferenceTextAreaRow({
  lyricText,
}: {
  lyricText: LyricText;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState(lyricText.text);

  return (
    <View width={"100%"} paddingStart={10} paddingEnd={10}>
      <TextArea
        aria-label="Reference lyric text"
        width={"100%"}
        value={value}
        onChange={(newVal) => {
          setValue(newVal);
          modifyLyricTexts(
            TextCustomizationSettingType.text,
            [lyricText.id],
            newVal
          );
        }}
      />
    </View>
  );
}

function SettingLabel({
  label,
  isLight,
  isProminent,
  isValue,
}: {
  label: string;
  isLight: boolean;
  isProminent?: boolean;
  isValue?: boolean;
}) {
  return (
    <View>
      <Text>
        <span
          style={{
            fontSize: isValue ? 10 : isProminent ? 12 : 11,
            fontWeight: isProminent ? 700 : 400,
            letterSpacing: isProminent ? "0.08em" : undefined,
            textTransform: isProminent ? "uppercase" : undefined,
            color: isProminent
              ? "rgba(255, 255, 255, 0.96)"
              : isLight
                ? "rgba(211,211,211, 0.8)"
                : isValue
                  ? "rgba(255, 255, 255, 0.72)"
                  : "",
          }}
        >
          {label}
        </span>
      </Text>
    </View>
  );
}

export function CustomizationSettingRow({
  label,
  value,
  settingComponent,
  prominentLabel = true,
  hideHeader = false,
}: {
  label: string;
  value: string;
  settingComponent: any;
  prominentLabel?: boolean;
  hideHeader?: boolean;
}) {
  return (
    <View paddingStart={10} paddingEnd={10} paddingTop={4} paddingBottom={6} overflow={"hidden"}>
      <View
        paddingTop={10}
        paddingBottom={12}
        paddingStart={10}
        paddingEnd={10}
        width="100%"
        UNSAFE_style={{
          background: "rgba(255, 255, 255, 0.035)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          borderRadius: 12,
          minWidth: 0,
        }}
      >
        <Flex direction={"column"} gap={8} width="100%" UNSAFE_style={{ minWidth: 0 }}>
          {hideHeader ? null : (
            <View>
              <Flex justifyContent={"space-between"}>
                <SettingLabel
                  label={label}
                  isLight={true}
                  isProminent={prominentLabel}
                />
                <SettingLabel label={value} isLight={false} isValue={true} />
              </Flex>
            </View>
          )}
          <View alignSelf={"stretch"} width="100%" UNSAFE_style={{ minWidth: 0 }}>
            {settingComponent}
          </View>
        </Flex>
      </View>
    </View>
  );
}

export function FontSizeSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(
    selectedLyricText?.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE
  );
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  return (
    <CustomizationSettingRow
      label={"Size"}
      value={String(value)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label="Size"
          labelVariant="setting-row"
          minValue={1}
          maxValue={72}
          step={1}
          value={value}
          onChange={(value: number) => {
            if (ids) {
              setValue(value);
              modifyLyricTexts(
                TextCustomizationSettingType.fontSize,
                ids,
                value
              );
            }
          }}
        />
      }
    />
  );
}

export function TextPositionSettingRow({
  label,
  selectedLyricText,
  selectedLyricTextIds,
  settingKey,
  width,
}: {
  label: string;
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  settingKey: TextCustomizationSettingType.textX | TextCustomizationSettingType.textY;
  width: any;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const initialValue =
    settingKey === TextCustomizationSettingType.textX
      ? selectedLyricText?.textX ?? 0.5
      : selectedLyricText?.textY ?? 0.5;
  const [value, setValue] = useState<number>(initialValue);
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  useEffect(() => {
    if (selectedLyricText) {
      setValue(
        settingKey === TextCustomizationSettingType.textX
          ? selectedLyricText.textX ?? 0.5
          : selectedLyricText.textY ?? 0.5
      );
      return;
    }

    if (!selectedLyricTextIds || selectedLyricTextIds.length === 0) {
      return;
    }

    const selectedValues = lyricTexts
      .filter((lyricText) => selectedLyricTextIds.includes(lyricText.id))
      .map((lyricText) =>
        settingKey === TextCustomizationSettingType.textX
          ? lyricText.textX ?? 0.5
          : lyricText.textY ?? 0.5
      );

    if (selectedValues.length === 0) {
      return;
    }

    const averageValue =
      selectedValues.reduce((sum, nextValue) => sum + nextValue, 0) /
      selectedValues.length;

    setValue(averageValue);
  }, [
    lyricTexts,
    selectedLyricText?.id,
    selectedLyricText?.textX,
    selectedLyricText?.textY,
    selectedLyricTextIds,
    settingKey,
  ]);

  return (
    <CustomizationSettingRow
      label={label}
      value={value.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label={label}
          labelVariant="setting-row"
          minValue={0}
          maxValue={1}
          step={0.01}
          value={value}
          onChange={(nextValue: number) => {
            if (ids) {
              setValue(nextValue);
              modifyLyricTexts(settingKey, ids, nextValue);
            }
          }}
        />
      }
    />
  );
}

export function ItemOpacitySettingRow({
  selectedLyricText,
  selectedLyricTextIds,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(selectedLyricText?.itemOpacity ?? 1);
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    }

    if (selectedLyricTextIds && selectedLyricTextIds.length > 0) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  useEffect(() => {
    if (selectedLyricText) {
      setValue(selectedLyricText.itemOpacity ?? 1);
      return;
    }

    if (!selectedLyricTextIds || selectedLyricTextIds.length === 0) {
      return;
    }

    const selectedValues = lyricTexts
      .filter((lyricText) => selectedLyricTextIds.includes(lyricText.id))
      .map((lyricText) => lyricText.itemOpacity ?? 1);

    if (selectedValues.length === 0) {
      return;
    }

    const averageValue =
      selectedValues.reduce((sum, nextValue) => sum + nextValue, 0) /
      selectedValues.length;

    setValue(averageValue);
  }, [lyricTexts, selectedLyricText, selectedLyricTextIds]);

  return (
    <CustomizationSettingRow
      label={"Opacity"}
      value={value.toFixed(2)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label="Opacity"
          labelVariant="setting-row"
          minValue={0}
          maxValue={1}
          step={0.01}
          value={value}
          onChange={(nextValue: number) => {
            if (ids) {
              setValue(nextValue);
              modifyLyricTexts(
                TextCustomizationSettingType.itemOpacity,
                ids,
                nextValue
              );
            }
          }}
        />
      }
    />
  );
}

export function ItemRenderSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<boolean>(selectedLyricText?.renderEnabled ?? true);
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    }

    if (selectedLyricTextIds && selectedLyricTextIds.length > 0) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  useEffect(() => {
    if (selectedLyricText) {
      setValue(selectedLyricText.renderEnabled ?? true);
      return;
    }

    if (!selectedLyricTextIds || selectedLyricTextIds.length === 0) {
      return;
    }

    const selectedValues = lyricTexts
      .filter((lyricText) => selectedLyricTextIds.includes(lyricText.id))
      .map((lyricText) => lyricText.renderEnabled ?? true);

    if (selectedValues.length === 0) {
      return;
    }

    const enabledCount = selectedValues.filter(Boolean).length;
    setValue(enabledCount >= Math.ceil(selectedValues.length / 2));
  }, [lyricTexts, selectedLyricText, selectedLyricTextIds]);

  return (
    <CustomizationSettingRow
      label={"Render"}
      value={value ? "On" : "Off"}
      settingComponent={
        <Switch
          isSelected={value}
          onChange={(nextValue) => {
            if (ids) {
              setValue(nextValue);
              modifyLyricTexts(
                TextCustomizationSettingType.renderEnabled,
                ids,
                nextValue
              );
            }
          }}
        >
          Render item
        </Switch>
      }
    />
  );
}

export function CenterTextPositionRow({
  selectedLyricText,
  selectedLyricTextIds,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const previewContainerRef = useEditorStore((state) => state.previewContainerRef);
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  return (
    <CustomizationSettingRow
      label={"Position"}
      value={"Center"}
      settingComponent={
        <Button
          variant="secondary"
          onPress={() => {
            if (!ids || !previewContainerRef) {
              return;
            }

            const previewWidth = Math.max(1, previewContainerRef.clientWidth);
            const previewHeight = Math.max(1, previewContainerRef.clientHeight);

            const nextLyricTexts = lyricTexts.map((lyricText) => {
              if (!ids.includes(lyricText.id)) {
                return lyricText;
              }

              const centeredPosition = getCenteredTextPosition({
                lyricText,
                previewWidth,
                previewHeight,
              });

              return {
                ...lyricText,
                textX: centeredPosition.textX,
                textY: centeredPosition.textY,
              };
            });

            setLyricTexts(nextLyricTexts, false);
          }}
        >
          Center In Preview
        </Button>
      }
    />
  );
}

const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function FontWeightSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);
  const value = selectedLyricText?.fontWeight ?? 400;
  const selectedKey = selectedLyricText ? String(value) : undefined;

  return (
    <CustomizationSettingRow
      label={"Font Weight"}
      value={selectedLyricText ? String(value) : "Mixed"}
      settingComponent={
        <Picker
          width="100%"
          selectedKey={selectedKey}
          onSelectionChange={(key: any) => {
            if (ids) {
              const nextValue = Number(key);
              modifyLyricTexts(
                TextCustomizationSettingType.fontWeight,
                ids,
                nextValue
              );
            }
          }}
        >
          {FONT_WEIGHTS.map((weight) => (
            <Item key={String(weight)} textValue={String(weight)}>
              <Text>
                <span style={{ fontWeight: weight }}>{weight}</span>
              </Text>
            </Item>
          ))}
        </Picker>
      }
    />
  );
}

const FONTS = [
  "Arial",
  "Arial Black",
  "Big Shoulders Inline Display Variable",
  "Caveat Variable",
  "Comfortaa Variable",
  "Comic Sans MS",
  "Courier New",
  "Dancing Script Variable",
  "Darker Grotesque Variable",
  "Edu NSW ACT Foundation Variable",
  "Georgia",
  "Impact",
  "Inter Variable",
  "Merienda Variable",
  "Montserrat Variable",
  "Open Sans Variable",
  "Red Hat Display Variable",
  "Roboto Mono Variable",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

export function FontSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<string>(
    selectedLyricText?.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME
  );
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  return (
    <CustomizationSettingRow
      label={"Font"}
      value={String(value)}
      settingComponent={
        <Picker
          width="100%"
          defaultSelectedKey={value}
          onSelectionChange={(key: any) => {
            if (ids) {
              setValue(key);
              modifyLyricTexts(
                TextCustomizationSettingType.fontName,
                ids,
                key
              );
            }
          }}
        >
          {FONTS.map((font) => (
            <Item key={font} textValue="font name">
              <Text>
                <span style={{ fontFamily: font }}>{font}</span>
              </Text>
            </Item>
          ))}
        </Picker>
      }
    />
  );
}

export function ShadowBlurSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(
    selectedLyricText?.shadowBlur ?? 0
  );

  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricTextIds, selectedLyricText]);

  return (
    <CustomizationSettingRow
      label={"Shadow Blur"}
      value={String(value)}
      hideHeader={true}
      settingComponent={
        <EffectSlider
          label="Shadow Blur"
          labelVariant="setting-row"
          minValue={0}
          maxValue={25}
          step={0.1}
          value={value}
          onChange={(value: number) => {
            if (ids) {
              setValue(value);
              modifyLyricTexts(
                TextCustomizationSettingType.shadowBlur,
                ids,
                value
              );
            }
          }}
        />
      }
    />
  );
}

export function ShadowBlurColorSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<RGBColor>(
    selectedLyricText?.shadowColor ?? { r: 0, g: 0, b: 0 }
  );
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  function handleColorChange(color: ColorResult) {
    if (ids) {
      setValue(color.rgb);
      modifyLyricTexts(
        TextCustomizationSettingType.shadowColor,
        ids,
        color.rgb
      );
    }
  }

  function handleColorChangeComplete(color: ColorResult) {
    // Optionally used for updates after the color picker is closed or interaction is finished.
  }

  return (
    <ColorPickerComponent
      color={value}
      onChange={handleColorChange}
      onChangeComplete={handleColorChangeComplete}
      label={"Shadow Blur Color"}
    />
  );
}

export function FontColorSettingRow({
  selectedLyricText,
  selectedLyricTextIds,
  width,
}: {
  selectedLyricText?: LyricText;
  selectedLyricTextIds?: number[];
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [color, setColor] = useState<RGBColor>(
    selectedLyricText?.fontColor ?? { r: 255, g: 255, b: 255 }
  );
  const ids = useMemo(() => {
    if (selectedLyricText) {
      return [selectedLyricText.id];
    } else if (selectedLyricTextIds) {
      return selectedLyricTextIds;
    }

    return undefined;
  }, [selectedLyricText, selectedLyricTextIds]);

  function handleColorChange(color: ColorResult) {
    if (ids) {
      setColor(color.rgb);
      modifyLyricTexts(
        TextCustomizationSettingType.fontColor,
        ids,
        color.rgb
      );
    }
  }

  function handleColorChangeComplete(color: ColorResult) {
    // Optionally used for updates after the color picker is closed or interaction is finished.
  }

  return (
    <ColorPickerComponent
      color={color}
      onChange={handleColorChange}
      onChangeComplete={handleColorChangeComplete}
      label={"Font Color"}
    />
  );
}

interface ColorPickerComponentProps {
  color: RGBColor;
  onChange: (color: ColorResult) => void;
  onChangeComplete?: (color: ColorResult) => void;
  label: string;
  hideLabel?: boolean;
  presetColors?: string[];
}

export function ColorPickerComponent({
  color,
  onChange,
  onChangeComplete,
  label,
  hideLabel,
  presetColors,
}: ColorPickerComponentProps) {
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  function handleCurrentColorClick() {
    const current = divRef.current;
    if (current) {
      const rect = current.getBoundingClientRect();
      setPickerPosition({ top: rect.bottom, left: rect.left });
    }
    setIsColorPickerVisible(!isColorPickerVisible);
  }

  // TODO: Improve color picker appear location
  const picker = (
    <OutsideClickHandler onOutsideClick={() => setIsColorPickerVisible(false)}>
      <View>
        <div
          ref={divRef}
          style={{
            backgroundColor: rgbToRgbaString(color),
            border: "solid",
            borderColor: "lightgray",
            borderRadius: 5,
            borderWidth: 1,
            cursor: "pointer",
            width: 70,
            height: 20,
            position: "relative",
          }}
          onClick={handleCurrentColorClick}
        ></div>
        {isColorPickerVisible ? (
          <div
            style={{
              position: "absolute",
              top: `${pickerPosition.top - 45}px`,
              left: `${15}px`,
              zIndex: 2,
              boxShadow:
                "0 4px 8px rgba(0, 0, 0, 0.3), 0 6px 20px rgba(0, 0, 0, 0.19)",
            }}
          >
            <SketchPicker
              color={color}
              onChange={onChange}
              onChangeComplete={onChangeComplete}
              presetColors={presetColors}
            />
          </div>
        ) : null}
      </View>
    </OutsideClickHandler>
  );

  if (hideLabel) {
    return picker;
  }

  return (
    <CustomizationSettingRow
      label={label}
      value={rgbToRgbaString(color)}
      settingComponent={picker}
    />
  );
}

export function rgbToRgbaString(color: RGBColor): string {
  const { r, g, b, a } = color;
  if (a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgba(${r}, ${g}, ${b}, 1)`;
}
