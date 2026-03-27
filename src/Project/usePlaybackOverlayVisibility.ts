import { useEffect, useRef, useState } from "react";
import { isMobile } from "../utils";

export function usePlaybackOverlayVisibility(playing: boolean) {
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const touchTimestampRef = useRef(0);
  const hideDelayMs = 2500;
  const controlsVisible = isMobile ? !isOverlayHidden : !isOverlayHidden || !playing;

  function clearHideTimer() {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function scheduleHide() {
    clearHideTimer();
    if (!playing) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsOverlayHidden(true);
      hideTimerRef.current = null;
    }, hideDelayMs);
  }

  function showControls() {
    setIsOverlayHidden(false);
    if (isMobile) {
      scheduleHide();
    }
  }

  function toggleControls() {
    setIsOverlayHidden((currentValue) => {
      const nextValue = !currentValue;
      if (nextValue) {
        clearHideTimer();
      } else if (isMobile) {
        scheduleHide();
      }
      return nextValue;
    });
  }

  function handleMouseLeave() {
    if (isMobile) {
      return;
    }
    clearHideTimer();
    setIsOverlayHidden(true);
  }

  function handleMouseMove() {
    if (isMobile) {
      return;
    }
    setIsOverlayHidden(false);
    scheduleHide();
  }

  function handleBackgroundTouchEnd() {
    if (!isMobile) {
      return;
    }
    touchTimestampRef.current = Date.now();
    toggleControls();
  }

  function handleBackgroundClick() {
    if (!isMobile) {
      return;
    }
    if (Date.now() - touchTimestampRef.current < 500) {
      return;
    }
    toggleControls();
  }

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    if (controlsVisible) {
      scheduleHide();
    } else {
      clearHideTimer();
    }
  }, [controlsVisible, playing]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, []);

  return {
    controlsVisible,
    isOverlayHidden,
    showControls,
    handleMouseLeave,
    handleMouseMove,
    handleBackgroundTouchEnd,
    handleBackgroundClick,
  };
}