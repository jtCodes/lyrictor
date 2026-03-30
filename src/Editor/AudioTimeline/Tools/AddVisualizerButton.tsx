import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useProjectStore } from "../../../Project/store";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../../theme";
import { buildDefaultVisualizerSetting } from "../../Visualizer/addVisualizerToTimeline";

export default function AddVisualizerButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleClick() {
    const setting = await buildDefaultVisualizerSetting(editingProject?.albumArtSrc);
    addNewLyricText("", position, false, "", true, setting);
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        aria-label="Add new visualizer at cursor"
        isQuiet
        width={"size-10"}
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={handleClick}
      >
        <GraphStreamRankedAdd />
      </ActionButton>
      <Tooltip>Add new visualizer at cursor</Tooltip>
    </TooltipTrigger>
  );
}
