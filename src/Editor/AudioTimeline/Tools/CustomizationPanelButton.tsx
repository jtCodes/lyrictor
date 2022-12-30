import { ActionButton } from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { LyricText } from "../../types";
import GraphBullet from "@spectrum-icons/workflow/GraphBullet";

export default function CustomizationPanelButton() {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const selectedPreviewTextIds = useEditorStore(
    (state) => state.selectedPreviewTextIds
  );
  const isCustomizationPanelOpen = useEditorStore(
    (state) => state.isCustomizationPanelOpen
  );
  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );

  function onPress() {
    // const updateLyricTexts = lyricTexts.map(
    //   (curLoopLyricText: LyricText, updatedIndex: number) => {
    //     if (selectedPreviewTextIds.has(curLoopLyricText.id)) {
    //       return {
    //         ...curLoopLyricText,
    //         fontSize: 24,
    //       };
    //     }

    //     return curLoopLyricText;
    //   }
    // );

    // setLyricTexts(updateLyricTexts);
    toggleCustomizationPanelState();
  }

  return (
    <ActionButton
      isQuiet={!isCustomizationPanelOpen}
      width={"size-10"}
      onPress={onPress}
    >
      <GraphBullet />
    </ActionButton>
  );
}
