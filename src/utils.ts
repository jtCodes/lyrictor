import { useProjectStore } from "./Project/store";
import { useEffect, useState } from "react";

interface WindowSize {
  width?: number;
  height?: number;
}

export function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState<WindowSize>({});
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    // Add event listener
    window.addEventListener("resize", handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount
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
