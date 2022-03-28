import React from "react";
import { useAudioPosition } from "react-use-audio-player";
import { useEditorStore } from "../store";
import { LyricText } from "./types";

export default function LyricPreview() {
  const lyricTexts = useEditorStore((state) => state.lyricTexts);
  const setLyricTexts = useEditorStore((state) => state.updateLyricTexts);
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });
  const maxEndTime = lyricTexts[lyricTexts.length - 1].end;

  function getCurrentLyric(): LyricText | undefined {
    if (position > maxEndTime) {
      return undefined;
    }

    let lyricText;

    for (let index = 0; index < lyricTexts.length; index++) {
      const element = lyricTexts[index];
      if (position >= element.start && position <= element.end) {
        lyricText = element;
        break;
      }
    }

    return lyricText;
  }

  return <div>{getCurrentLyric()?.text}</div>;
}
