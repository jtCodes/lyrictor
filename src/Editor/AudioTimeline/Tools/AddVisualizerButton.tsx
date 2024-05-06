import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";

export default function AddVisualizerButton() {
  return (
    <TooltipTrigger delay={1000}>
      <ActionButton isQuiet width={"size-10"} onPress={() => {}}>
        <GraphStreamRankedAdd />
      </ActionButton>
      <Tooltip>Add new lyric at cursor</Tooltip>
    </TooltipTrigger>
  );
}
