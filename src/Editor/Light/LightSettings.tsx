import { Flex, Text, View } from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { extractProminentColors, rgbToHex } from "../Visualizer/colorExtractor";
import {
  LightSettings as LightSettingsType,
  normalizeLightSettings,
} from "./store";
import BaseLightSettings from "./BaseLightSettings";
import LightPaletteKeyframes from "./LightPaletteKeyframes";

type LightSettingKey = keyof LightSettingsType;

export default function LightSettings({ width }: { width: number }) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const editingProject = useProjectStore((state) => state.editingProject);
  const modifyLightSettings = useProjectStore((state) => state.modifyLightSettings);
  const selectedLyricTextIds = useEditorStore((state) => state.selectedLyricTextIds);
  const [albumPresetColors, setAlbumPresetColors] = useState<string[]>();

  useEffect(() => {
    if (!editingProject?.albumArtSrc) {
      setAlbumPresetColors(undefined);
      return;
    }

    extractProminentColors(editingProject.albumArtSrc)
      .then((colors) => setAlbumPresetColors(colors.map(rgbToHex)))
      .catch(() => setAlbumPresetColors(undefined));
  }, [editingProject?.albumArtSrc, editingProject?.name]);

  const selectedLight = useMemo(() => {
    if (selectedLyricTextIds.size !== 1) {
      return undefined;
    }

    return lyricTexts.find(
      (lyricText) => lyricText.isLight && selectedLyricTextIds.has(lyricText.id)
    );
  }, [lyricTexts, selectedLyricTextIds]);

  const settings = useMemo(
    () => normalizeLightSettings(selectedLight?.lightSettings),
    [selectedLight?.lightSettings]
  );

  function updateSetting<T extends LightSettingKey>(
    key: T,
    value: LightSettingsType[T]
  ) {
    if (!selectedLight) {
      return;
    }

    modifyLightSettings(key, [selectedLight.id], value);
  }

  if (!selectedLight) {
    return (
      <View
        UNSAFE_style={{
          fontStyle: "italic",
          color: "lightgray",
          opacity: 0.8,
        }}
        paddingStart={10}
      >
        No light element selected
      </View>
    );
  }

  return (
    <View width={width} UNSAFE_style={{ overflowX: "hidden" }}>
      <Flex direction="column" gap="size-300">
        <BaseLightSettings
          settings={settings}
          presetColors={albumPresetColors}
          onChange={updateSetting}
        />
        <LightPaletteKeyframes
          light={selectedLight}
          settings={settings}
          onChange={(paletteKeyframes) =>
            updateSetting("paletteKeyframes", paletteKeyframes)
          }
        />
      </Flex>
    </View>
  );
}
