import {
  View,
  Text,
  Flex,
  Slider,
  Picker,
  Item,
  TextArea,
} from "@adobe/react-spectrum";
import { useState } from "react";
import { useProjectStore } from "../../../Project/store";
import {
  DEFAULT_TEXT_PREVIEW_FONT_NAME,
  DEFAULT_TEXT_PREVIEW_FONT_SIZE,
  LyricText,
} from "../../types";
import { CUSTOMIZATION_PANEL_WIDTH } from "./LyricTextCustomizationToolPanel";
import { TextCustomizationSettingType } from "./types";

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

function CustomizationSettingRow({
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
