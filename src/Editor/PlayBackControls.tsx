import { Button, Flex } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";

interface PlayBackControlsProps {
  isPlaying: boolean;
  onPlayPauseClicked: () => void;
}

export default function PlayBackControls(props: PlayBackControlsProps) {
  return (
    <Flex direction="row" justifyContent={"center"} gap="size-100">
      <Button
        variant="secondary"
        isQuiet
        width={"size-10"}
        onPress={props.onPlayPauseClicked}
      >
        {props.isPlaying ? <Pause /> : <Play />}
      </Button>
    </Flex>
  );
}
