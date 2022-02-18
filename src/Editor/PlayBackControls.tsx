import { Button, Flex } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";

export default function PlayBackControls() {
  return (
    <Flex direction="row" justifyContent={"center"} gap="size-100">
      <Button variant="secondary" isQuiet width={"size-10"}>
        <Play />
      </Button>
    </Flex>
  );
}
