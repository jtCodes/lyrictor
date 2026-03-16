import { useState } from "react";
import { generateLyricTextId, useProjectStore } from "../../Project/store";
import { deepClone } from "../../utils";
import { LyricText } from "../types";
import { useEditorStore } from "../store";
import { EditOptionType } from "../EditDropDownMenu";
import { useAudioPosition } from "./useAudioPosition";

export function useEditActions({
  timelineWidth,
  duration,
}: {
  timelineWidth: number;
  duration: number;
}) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const undoLyricTextsHistory = useProjectStore(
    (state) => state.undoLyricTextEdit
  );

  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );
  const setSelectedLyricTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const setCustomizationPanelTabId = useEditorStore(
    (state) => state.setCustomizationPanelTabId
  );

  const { position } = useAudioPosition({ highRefreshRate: false });

  const [copiedLyricTexts, setCopiedLyricTexts] = useState<LyricText[]>([]);

  function onCopy() {
    const selectedLyricTexts = lyricTexts.filter((lyricText: LyricText) =>
      selectedLyricTextIds.has(lyricText.id)
    );
    setCopiedLyricTexts(deepClone(selectedLyricTexts));
  }

  function onPaste() {
    if (copiedLyricTexts.length > 0) {
      const timeDifferenceFromCursor = position - copiedLyricTexts[0].start;
      const shiftedLyricTexts = copiedLyricTexts.map((lyricText, index) => {
        const start = lyricText.start + timeDifferenceFromCursor;
        const end = lyricText.end + timeDifferenceFromCursor;
        return {
          ...lyricText,
          id: generateLyricTextId() + index,
          start,
          end,
        };
      });
      setSelectedLyricTextIds(new Set(shiftedLyricTexts.map((l) => l.id)));
      setLyricTexts([...lyricTexts, ...shiftedLyricTexts]);
    }
  }

  function onDelete() {
    setLyricTexts(
      lyricTexts.filter((lyricText) => !selectedLyricTextIds.has(lyricText.id))
    );
    setCustomizationPanelTabId("reference");
  }

  function handleOnEditMenuItemClick(action: EditOptionType) {
    switch (action) {
      case "delete":
        onDelete();
        break;
      case "undo":
        undoLyricTextsHistory();
        break;
      case "copy":
        onCopy();
        break;
      case "paste":
        onPaste();
        break;
      default:
        break;
    }
  }

  return {
    copiedLyricTexts,
    onCopy,
    onPaste,
    onDelete,
    handleOnEditMenuItemClick,
  };
}
