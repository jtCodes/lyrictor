import { ActionButton, Button, Flex } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";
import { isMobile } from "../../utils";

interface PlayBackControlsProps {
  isPlaying: boolean;
  onPlayPauseClicked: () => void;
}

export default function PlayPauseButton(props: PlayBackControlsProps) {
  return (
    <Flex direction="row" justifyContent={"center"} gap="size-100">
      <ActionButton
        isQuiet
        width={isMobile ? "size-1200" : "size-10"}
        height={isMobile ? "size-1200" : undefined}
        onPress={props.onPlayPauseClicked}
        UNSAFE_style={isMobile ? {
          fontSize: "32px",
        } : undefined}
      >
        {props.isPlaying ? <Pause /> : <Play />}
      </ActionButton>
    </Flex>
  );
}
