import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../../theme";
import { buildDefaultLightSetting } from "../../Light/addLightToTimeline";

function LightButtonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.2" fill="currentColor" opacity="0.95" />
      <path
        d="M9 1.5v2.1M9 14.4v2.1M1.5 9h2.1M14.4 9h2.1M3.7 3.7l1.5 1.5M12.8 12.8l1.5 1.5M14.3 3.7l-1.5 1.5M5.2 12.8l-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AddLightButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleClick() {
    const settings = await buildDefaultLightSetting(editingProject?.albumArtSrc);
    addNewLyricText("", position, false, "", false, undefined, false, undefined, true, settings);
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        aria-label="Add new light element at cursor"
        isQuiet
        width={"size-10"}
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={() => void handleClick()}
      >
        <LightButtonIcon />
      </ActionButton>
      <Tooltip>Add new light element at cursor</Tooltip>
    </TooltipTrigger>
  );
}