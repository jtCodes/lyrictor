import { ActionButton, Tooltip, TooltipTrigger } from "@adobe/react-spectrum";
import TextAdd from "@spectrum-icons/workflow/TextAdd";
import { useProjectStore } from "../../../Project/store";

export default function AddLyricTextButton({
  position,
  text = "text",
}: {
  position: number;
  text?: string;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        isQuiet
        width={"size-10"}
        onPress={() => {
          addNewLyricText(text, position, false, "", false, undefined);
        }}
      >
        <TextAdd />
      </ActionButton>
      <Tooltip>Add new lyric at cursor</Tooltip>
    </TooltipTrigger>
  );
}
