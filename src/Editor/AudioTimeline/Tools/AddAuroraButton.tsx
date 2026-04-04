import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../../theme";
import { buildDefaultAuroraSetting } from "../../Visualizer/addVisualizerToTimeline";

function AuroraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2 13.2C4.4 8.2 6.4 6.8 8.6 8c1.6.8 2.8-.1 4-1.7 1-1.4 2.1-2.5 3.4-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 15c2.2-4.1 4.2-4.8 5.9-3.9 1.8.9 3-.2 4.4-1.6 1.1-1.2 2.1-1.9 3.7-2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.64"
      />
    </svg>
  );
}

export default function AddAuroraButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleClick() {
    const setting = await buildDefaultAuroraSetting(editingProject?.albumArtSrc);
    addNewLyricText("", position, false, "", true, setting);
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        aria-label="Add new aurora at cursor"
        isQuiet
        width={"size-10"}
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={handleClick}
      >
        <AuroraIcon />
      </ActionButton>
      <Tooltip>Add new aurora at cursor</Tooltip>
    </TooltipTrigger>
  );
}