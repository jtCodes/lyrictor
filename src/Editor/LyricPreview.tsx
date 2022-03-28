import React from "react";
import { useAudioPosition } from "react-use-audio-player";
import { useEditorStore } from "../store";
import { LyricText } from "./types";
import { getCurrentLyric } from "./utils";

export default function LyricPreview() {
  const lyricTexts = useEditorStore((state) => state.lyricTexts);
  const setLyricTexts = useEditorStore((state) => state.updateLyricTexts);
  const { percentComplete, duration, seek, position } = useAudioPosition({
    highRefreshRate: true,
  });
  const maxEndTime = lyricTexts[lyricTexts.length - 1].end;

  return <div>{getCurrentLyric(lyricTexts, position, maxEndTime)?.text}</div>;
}
