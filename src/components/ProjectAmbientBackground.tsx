import { useId } from "react";
import { useProjectStore } from "../Project/store";
import { useWindowSize } from "../utils";
import ImmersiveLyricPreview from "./ImmersiveLyricPreview";
import { getAmbientRenderGeometry } from "./ambientRenderGeometry";

export default function ProjectAmbientBackground() {
  const project = useProjectStore(state => state.editingProject);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const width = Math.max(1, windowWidth ?? 1);
  const height = Math.max(1, windowHeight ?? 1);
  const { scale, previewWidth, previewHeight, blurSigma, margin } = getAmbientRenderGeometry(width, height);
  const filterId = `ambient-blur-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", contain: "strict", overflow: "hidden" }}>
      {/* Native SVG filtering avoids Safari's large CSS blur() path. Keep the
          definition mounted, with explicit small bounds and transparent bleed. */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
            x={-margin} y={-margin} width={previewWidth + margin * 2} height={previewHeight + margin * 2}
            colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={blurSigma} />
            <feColorMatrix type="saturate" values="1.1" />
          </filter>
        </defs>
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%", width, height,
        transform: "translate(-50%, -50%) scale(2.5)", transformOrigin: "center",
        opacity: 0.35,
        maskImage: "radial-gradient(ellipse at center, black 0%, rgba(0,0,0,.8) 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, rgba(0,0,0,.8) 40%, transparent 100%)",
      }}>
        <div style={{ width: previewWidth, height: previewHeight, transform: `scale(${1 / scale})`, transformOrigin: "top left" }}>
          <div style={{ width: previewWidth, height: previewHeight, filter: `url(#${filterId})` }}>
            <ImmersiveLyricPreview maxWidth={previewWidth} maxHeight={previewHeight}
              resolution={project?.resolution} editingMode={project?.editingMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
