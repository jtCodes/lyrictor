import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useProjectStore } from "../../../Project/store";
import { DEFAULT_VISUALIZER_SETTING } from "../../Visualizer/store";

export default function AddVisualizerButton({
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
      true,
      JSON.parse(JSON.stringify(DEFAULT_VISUALIZER_SETTING))
    );
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton isQuiet width={"size-10"} onPress={handleClick}>
        <GraphStreamRankedAdd />
      </ActionButton>
      <Tooltip>Add new visualizer at cursor</Tooltip>
    </TooltipTrigger>
  );
}
