import { useCallback, useEffect, useRef } from "react";
import { useAudioPlayer as usePlayer } from "react-use-audio-player";
import { ToastQueue } from "@react-spectrum/toast";
import { registerPlaybackAudio, resumePlaybackAudio } from "./resumePlaybackAudio";
import { usePlaybackPreparation } from "./PlaybackPreparationProvider";

/** Gate audio itself, including shortcuts, autoplay and loop restarts. */
export function useAudioPlayer(options?: Parameters<typeof usePlayer>[0]) {
  const audio = usePlayer(options);
  const latest = useRef(audio);
  latest.current = audio;
  const preparation = usePlaybackPreparation();
  useEffect(() => registerPlaybackAudio(() => latest.current.player ?? undefined), []);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current++; }, []);
  const prepareStart = useCallback(() => {
    const version = ++requestVersion.current;
    const player = latest.current.player;
    const resumed = resumePlaybackAudio();
    if (!resumed) {
      return () => { if (latest.current.player === player) player?.play(); };
    }
    return () => {
      const start = () => {
        if (requestVersion.current === version && latest.current.player === player) {
          player?.play();
        }
      };
      void resumed.then((ready) => {
        if (requestVersion.current !== version || latest.current.player !== player) return;
        if (ready) start();
        else ToastQueue.negative("Safari could not restore audio. Try Play again.", { timeout: 5000 });
      });
    };
  }, []);
  const play = useCallback(() => {
    const start = prepareStart();
    if (preparation) preparation.requestPlay(start);
    else start();
  }, [preparation, prepareStart]);
  const pause = useCallback(() => {
    requestVersion.current++;
    preparation?.cancelPlay();
    latest.current.pause();
  }, [preparation]);
  const togglePlayPause = useCallback(() => {
    if (latest.current.playing) { pause(); return; }
    const start = prepareStart();
    if (preparation) preparation.togglePlayRequest(start);
    else start();
  }, [pause, preparation, prepareStart]);
  return { ...audio, play, pause, togglePlayPause };
}
