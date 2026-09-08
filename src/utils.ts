import { isDocumentFullscreen, PAGE_FULLSCREEN_CHANGE } from "./fullscreen";
export { isDocumentFullscreen, requestDocumentFullscreen, exitDocumentFullscreen } from "./fullscreen";
import { useProjectStore } from "./Project/store";
import { useEffect, useRef, useState } from "react";

interface WindowSize {
  width?: number;
  height?: number;
}

export const isSafariBrowser =
  typeof navigator !== "undefined" &&
  /Safari/i.test(navigator.userAgent) &&
  !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(navigator.userAgent);

function getCurrentWindowSize(): WindowSize {
  if (typeof window === "undefined") {
    return {};
  }

  const viewport = window.visualViewport;

  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState<WindowSize>(() =>
    getCurrentWindowSize()
  );

  useEffect(() => {
    function handleResize() {
      setWindowSize(getCurrentWindowSize());
    }

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  return windowSize;
}

export function useKeyPress(targetKey: string) {
  const isPopupOpen = useProjectStore((state) => state.isPopupOpen);
  // State for keeping track of whether key is pressed
  const [keyPressed, setKeyPressed] = useState<boolean>(false);
  // If pressed key is our target key then set to true
  function downHandler({
    key,
    target,
  }: {
    key: string;
    target: any;
    type: any;
  }) {
    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.contentEditable === "true";

    if (
      !isInput &&
      key === targetKey &&
      target.getAttribute("role") !== "textbox"
    ) {
      setKeyPressed(true);
    }
  }
  // If released key is our target key then set to false
  const upHandler = ({ key }: { key: string }) => {
    if (key === targetKey) {
      setKeyPressed(false);
    }
  };
  // Add event listeners
  useEffect(() => {
    if (isPopupOpen) {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    } else {
      window.addEventListener("keydown", downHandler);
      window.addEventListener("keyup", upHandler);
    }
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return keyPressed;
}

export function useKeyPressCombination(
  targetKey: string,
  isShift: boolean = false
) {
  const isPopupOpen = useProjectStore((state) => state.isPopupOpen);
  const [keyPressed, setKeyPressed] = useState<boolean>(false);

  function downHandler(e: any) {
    const isInput =
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.contentEditable === "true";

    if (!isInput && e.key === targetKey && (e.metaKey || e.ctrlKey)) {
      if ((isShift && e.shiftKey) || !isShift) {
        e.preventDefault(); // Prevent default only if not in input/textarea/contentEditable
        setKeyPressed(true);
      }
    } else {
      setKeyPressed(false);
    }
  }

  const upHandler = ({
    key,
    metaKey,
    ctrlKey,
  }: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
  }) => {
    if (key === targetKey || key === "Meta") {
      setKeyPressed(false);
    }
  };

  useEffect(() => {
    if (isPopupOpen) {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    } else {
      console.log("add combination listener");
      window.addEventListener("keydown", downHandler);
      window.addEventListener("keyup", upHandler);
    }
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [isPopupOpen]);

  return keyPressed;
}

export function deepClone(object: any) {
  return JSON.parse(JSON.stringify(object));
}

interface KeyAction {
  key: string;
  combo?: boolean;
  shift?: boolean;
  action: () => void;
  /** If true, action fires even when isEditing or popup is open */
  always?: boolean;
}

export function useKeyboardActions(
  actions: KeyAction[],
  deps: any[],
  { isEditing = false, isPopupOpen = false } = {}
) {
  const storePopupOpen = useProjectStore((state) => state.isPopupOpen);
  const popupOpen = isPopupOpen || storePopupOpen;

  const actionsRef = useRef(actions);
  const flagsRef = useRef({ isEditing, popupOpen });

  useEffect(() => {
    actionsRef.current = actions;
    flagsRef.current = { isEditing, popupOpen };
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inputType =
        target instanceof HTMLInputElement
          ? target.type.toLowerCase()
          : undefined;
      const isTextInput =
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"], [role="textbox"]') !== null ||
        (inputType !== undefined &&
          ![
            "button",
            "checkbox",
            "color",
            "file",
            "image",
            "radio",
            "range",
            "reset",
            "submit",
          ].includes(inputType));

      const { isEditing: editing, popupOpen: popup } = flagsRef.current;

      for (const a of actionsRef.current) {
        if (e.key.toLowerCase() !== a.key.toLowerCase()) continue;

        if (a.combo) {
          if (!(e.metaKey || e.ctrlKey)) continue;
          if (a.shift && !e.shiftKey) continue;
          if (!a.shift && e.shiftKey) continue;
          if (isTextInput) continue;
        } else {
          if (isTextInput) continue;
        }

        if (!a.always && (editing || popup)) continue;

        if (a.combo) e.preventDefault();
        a.action();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

// export const isMobile = true
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function checkFullScreen() {
  return isDocumentFullscreen();
}

export function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(isDocumentFullscreen());

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(isDocumentFullscreen());
    };

    document.addEventListener(PAGE_FULLSCREEN_CHANGE, syncFullscreenState);
    window.addEventListener("resize", syncFullscreenState);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
    document.addEventListener("mozfullscreenchange", syncFullscreenState as EventListener);
    document.addEventListener("MSFullscreenChange", syncFullscreenState as EventListener);

    syncFullscreenState();

    return () => {
      document.removeEventListener(PAGE_FULLSCREEN_CHANGE, syncFullscreenState);
      window.removeEventListener("resize", syncFullscreenState);
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState as EventListener
      );
      document.removeEventListener(
        "mozfullscreenchange",
        syncFullscreenState as EventListener
      );
      document.removeEventListener(
        "MSFullscreenChange",
        syncFullscreenState as EventListener
      );
    };
  }, []);

  return isFullscreen;
}
