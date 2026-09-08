import { useProjectStore } from "../Project/store";
import { useWindowSize } from "../utils";
import ImmersiveLyricPreview from "./ImmersiveLyricPreview";

const AMBIENT_SCALE = 0.08;

export default function ProjectAmbientBackground() {
  const project = useProjectStore(state => state.editingProject);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const width = Math.max(1, windowWidth ?? 1);
  const height = Math.max(1, windowHeight ?? 1);
  const previewWidth = width * AMBIENT_SCALE;
  const previewHeight = height * AMBIENT_SCALE;

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", contain: "strict", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", width, height,
        transform: "translate(-50%, -50%) scale(2.5)", transformOrigin: "center",
        opacity: 0.35, filter: "blur(80px) saturate(1.1)",
        maskImage: "radial-gradient(ellipse at center, black 0%, rgba(0,0,0,.8) 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, rgba(0,0,0,.8) 40%, transparent 100%)",
      }}>
        <div style={{ width: previewWidth, height: previewHeight, transform: `scale(${1 / AMBIENT_SCALE})`, transformOrigin: "top left" }}>
          <ImmersiveLyricPreview maxWidth={previewWidth} maxHeight={previewHeight}
            resolution={project?.resolution} editingMode={project?.editingMode} />
        </div>
      </div>
    </div>
  );
}
