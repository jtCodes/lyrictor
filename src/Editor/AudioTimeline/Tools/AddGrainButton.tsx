import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../../theme";
import { buildDefaultGrainSetting } from "../../Grain/addGrainToTimeline";

function GrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="4" cy="4" r="1" fill="currentColor" opacity="0.9" />
      <circle cx="8.5" cy="3" r="0.9" fill="currentColor" opacity="0.72" />
      <circle cx="13.2" cy="4.8" r="1.1" fill="currentColor" opacity="0.88" />
      <circle cx="5.4" cy="8.8" r="0.85" fill="currentColor" opacity="0.64" />
      <circle cx="10.6" cy="9.5" r="1.15" fill="currentColor" opacity="0.82" />
      <circle cx="14.1" cy="8.4" r="0.75" fill="currentColor" opacity="0.58" />
      <circle cx="4.1" cy="13" r="1.05" fill="currentColor" opacity="0.84" />
      <circle cx="8.9" cy="14.2" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="13.5" cy="13.1" r="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export default function AddGrainButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);

  function handleClick() {
    addNewLyricText(
      "",
      position,
      false,
      "",
      false,
      undefined,
      false,
      undefined,
      false,
      undefined,
      true,
      buildDefaultGrainSetting()
    );
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        aria-label="Add new grain element at cursor"
        isQuiet
        width={"size-10"}
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={handleClick}
      >
        <GrainIcon />
      </ActionButton>
      <Tooltip>Add new grain element at cursor</Tooltip>
    </TooltipTrigger>
  );
}