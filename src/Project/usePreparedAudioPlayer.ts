import { useCallback, useRef } from "react";
import { useAudioPlayer as usePlayer } from "react-use-audio-player";
import { usePlaybackPreparation } from "./PlaybackPreparationProvider";

/** Gate audio itself, including shortcuts, autoplay and loop restarts. */
export function useAudioPlayer(options?: Parameters<typeof usePlayer>[0]) {
  const audio = usePlayer(options);
  const latest = useRef(audio);
  latest.current = audio;
  const preparation = usePlaybackPreparation();
  const play = useCallback(() => {
    const player = latest.current.player;
    const start = () => { if (latest.current.player === player) player?.play(); };
    if (preparation) preparation.requestPlay(start);
    else start();
  }, [preparation]);
  const pause = useCallback(() => {
    preparation?.cancelPlay();
    latest.current.pause();
  }, [preparation]);
  const togglePlayPause = useCallback(() => {
    if (latest.current.playing) { pause(); return; }
    const player = latest.current.player;
    const start = () => { if (latest.current.player === player) player?.play(); };
    if (preparation) preparation.togglePlayRequest(start);
    else start();
  }, [pause, preparation]);
  return { ...audio, play, pause, togglePlayPause };
}
