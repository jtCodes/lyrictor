import { useState } from "react";
import { generateLyricTextId, useProjectStore } from "../../Project/store";
import { deepClone } from "../../utils";
import { LyricText } from "../types";
import { useEditorStore } from "../store";
import { EditOptionType } from "../EditDropDownMenu";
import { useAudioPosition } from "react-use-audio-player";
import { pushCollidingItemsUpFromLevels } from "./utils";

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
  const clearEditingText = useEditorStore((state) => state.clearEditingText);
  const setActiveTimelineTool = useEditorStore(
    (state) => state.setActiveTimelineTool
  );
  const toggleCustomizationPanelOpenState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
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

  function onCut() {
    setActiveTimelineTool("cut");
  }

  function onSelectAllText() {
    const nextSelectedLyricTextIds = new Set(
      lyricTexts
        .filter((lyricText) => !lyricText.isImage && !lyricText.isVisualizer)
        .map((lyricText) => lyricText.id)
    );

    setSelectedLyricTextIds(nextSelectedLyricTextIds);

    if (nextSelectedLyricTextIds.size > 0) {
      setCustomizationPanelTabId("text_settings");
      toggleCustomizationPanelOpenState(true);
    }
  }

  function onConvertToWordStack() {
    if (selectedLyricTextIds.size !== 1) {
      return;
    }

    const selectedLyricText = lyricTexts.find((lyricText) =>
      selectedLyricTextIds.has(lyricText.id)
    );

    if (
      !selectedLyricText ||
      selectedLyricText.isImage ||
      selectedLyricText.isVisualizer
    ) {
      return;
    }

    const words = selectedLyricText.text
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length <= 1) {
      return;
    }

    const wordItems = words.map((word, index) => ({
      ...selectedLyricText,
      id: index === 0 ? selectedLyricText.id : generateLyricTextId() + index,
      text: word,
      textBoxTimelineLevel: selectedLyricText.textBoxTimelineLevel + index,
    }));

    const nextLyricTexts = lyricTexts.flatMap((lyricText) => {
      if (lyricText.id !== selectedLyricText.id) {
        return [lyricText];
      }

      return wordItems;
    });

    const stackedLyricTexts = pushCollidingItemsUpFromLevels({
      lyricTexts: nextLyricTexts,
      movingLyricTextIds: wordItems.map((lyricText) => lyricText.id),
    });

    clearEditingText();
    setSelectedLyricTextIds(new Set(wordItems.map((lyricText) => lyricText.id)));
    setCustomizationPanelTabId("text_settings");
    toggleCustomizationPanelOpenState(true);
    setLyricTexts(stackedLyricTexts, false);
  }

  function onMatchSelectionToAudioDuration() {
    if (selectedLyricTextIds.size === 0 || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextLyricTexts = lyricTexts.map((lyricText) => {
      if (!selectedLyricTextIds.has(lyricText.id)) {
        return lyricText;
      }

      return {
        ...lyricText,
        start: 0,
        end: duration,
      };
    });

    setLyricTexts(nextLyricTexts);
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
      case "cut":
        onCut();
        break;
      case "paste":
        onPaste();
        break;
      case "select-all-text":
        onSelectAllText();
        break;
      case "convert-to-word-stack":
        onConvertToWordStack();
        break;
      case "match-selection-to-audio-duration":
        onMatchSelectionToAudioDuration();
        break;
      default:
        break;
    }
  }

  return {
    copiedLyricTexts,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    handleOnEditMenuItemClick,
  };
}
