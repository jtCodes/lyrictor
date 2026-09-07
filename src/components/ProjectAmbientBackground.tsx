import { useMemo } from "react";
import { useProjectStore } from "../Project/store";
import { getAmbientBackground } from "../Project/ambientPalette";

export default function ProjectAmbientBackground() {
  const items = useProjectStore((state) => state.lyricTexts);
  const background = useMemo(() => getAmbientBackground(items), [items]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        contain: "strict",
        opacity: 0.35,
        background,
      }}
    />
  );
}
