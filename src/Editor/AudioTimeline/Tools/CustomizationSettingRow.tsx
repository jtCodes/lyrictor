import {
  View,
  Text,
  Flex,
  Slider,
  Picker,
  Item,
  TextArea,
} from "@adobe/react-spectrum";
import { ColorResult, RGBColor, SketchPicker } from "react-color";
import { useRef, useState } from "react";
import { useProjectStore } from "../../../Project/store";
import {
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../types";
import { CUSTOMIZATION_PANEL_WIDTH } from "./LyricTextCustomizationToolPanel";
import { TextCustomizationSettingType } from "./types";
import OutsideClickHandler from "react-outside-click-handler";

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

function SettingLabel({ label, isLight }: { label: string; isLight: boolean }) {
  return (
    <View>
      <Text>
        <span
          style={{
            fontSize: 11,
            color: isLight ? "rgba(211,211,211, 0.8)" : "",
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
}: {
  label: string;
  value: string;
  settingComponent: any;
}) {
  return (
    <View paddingStart={10} paddingEnd={10} overflow={"hidden"}>
      <Flex direction={"column"}>
        <View>
          <Flex justifyContent={"space-between"}>
            <SettingLabel label={label} isLight={true} />
            <SettingLabel label={value} isLight={false} />
          </Flex>
        </View>
        <View alignSelf={"start"}>{settingComponent}</View>
      </Flex>
    </View>
  );
}

export function FontSizeSettingRow({
  selectedLyricText,
  width,
}: {
  selectedLyricText: LyricText;
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(
    selectedLyricText.fontSize ?? DEFAULT_TEXT_PREVIEW_FONT_SIZE
  );

  return (
    <CustomizationSettingRow
      label={"Size"}
      value={String(value)}
      settingComponent={
        <Slider
          width={width - 20}
          minValue={1}
          maxValue={72}
          defaultValue={value}
          onChange={(value: number) => {
            setValue(value);
            modifyLyricTexts(
              TextCustomizationSettingType.fontSize,
              [selectedLyricText.id],
              value
            );
          }}
        />
      }
    />
  );
}

const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function FontWeightSettingRow({
  selectedLyricText,
}: {
  selectedLyricText: LyricText;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(
    selectedLyricText.fontWeight ?? 400
  );

  return (
    <CustomizationSettingRow
      label={"Font Weight"}
      value={String(value)}
      settingComponent={
        <Picker
          width={CUSTOMIZATION_PANEL_WIDTH - 30}
          defaultSelectedKey={value}
          onSelectionChange={(key: any) => {
            setValue(key);
            modifyLyricTexts(
              TextCustomizationSettingType.fontWeight,
              [selectedLyricText.id],
              key
            );
          }}
        >
          {FONT_WEIGHTS.map((weight) => (
            <Item key={weight} textValue="font weight">
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
}: {
  selectedLyricText: LyricText;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<string>(
    selectedLyricText.fontName ?? DEFAULT_TEXT_PREVIEW_FONT_NAME
  );

  return (
    <CustomizationSettingRow
      label={"Font"}
      value={String(value)}
      settingComponent={
        <Picker
          defaultSelectedKey={value}
          onSelectionChange={(key: any) => {
            setValue(key);
            modifyLyricTexts(
              TextCustomizationSettingType.fontName,
              [selectedLyricText.id],
              key
            );
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
  width,
}: {
  selectedLyricText: LyricText;
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<number>(selectedLyricText.shadowBlur ?? 0);

  return (
    <CustomizationSettingRow
      label={"Shadow Blur"}
      value={String(value)}
      settingComponent={
        <Slider
          width={width - 20}
          minValue={0}
          maxValue={25}
          step={0.1}
          defaultValue={value}
          onChange={(value: number) => {
            setValue(value);
            modifyLyricTexts(
              TextCustomizationSettingType.shadowBlur,
              [selectedLyricText.id],
              value
            );
          }}
        />
      }
    />
  );
}

export function ShadowBlurColorSettingRow({
  selectedLyricText,
  width,
}: {
  selectedLyricText: LyricText;
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [value, setValue] = useState<RGBColor>(
    selectedLyricText.shadowColor ?? { r: 0, g: 0, b: 0 }
  );

  function handleColorChange(color: ColorResult) {
    setValue(color.rgb);
    modifyLyricTexts(
      TextCustomizationSettingType.shadowColor,
      [selectedLyricText.id],
      color.rgb
    );
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
  width,
}: {
  selectedLyricText: LyricText;
  width: any;
}) {
  const modifyLyricTexts = useProjectStore((state) => state.modifyLyricTexts);
  const [color, setColor] = useState<RGBColor>(
    selectedLyricText.fontColor ?? { r: 255, g: 255, b: 255 }
  );

  function handleColorChange(color: ColorResult) {
    console.log(color);
    setColor(color.rgb);
    modifyLyricTexts(
      TextCustomizationSettingType.fontColor,
      [selectedLyricText.id],
      color.rgb
    );
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
  hideLabel?: boolean
}

export function ColorPickerComponent({
  color,
  onChange,
  onChangeComplete,
  label,
  hideLabel
}: ColorPickerComponentProps) {
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  function handleCurrentColorClick() {
    const current = divRef.current;
    if (current) {
      const rect = current.getBoundingClientRect();
      console.log(rect)
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
            />
          </div>
        ) : null}
      </View>
    </OutsideClickHandler>
  );
  
  if (hideLabel) {
    return picker
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
