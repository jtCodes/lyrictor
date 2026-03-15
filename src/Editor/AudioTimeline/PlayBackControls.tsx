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
        aria-label={props.isPlaying ? "Pause playback" : "Play playback"}
        isQuiet
        width={isMobile ? "size-600" : "size-10"}
        height={isMobile ? "size-600" : undefined}
        onPress={props.onPlayPauseClicked}
      >
        {props.isPlaying ? (
          <Pause size={isMobile ? "L" : "S"} />
        ) : (
          <Play size={isMobile ? "L" : "S"} />
        )}
      </ActionButton>
    </Flex>
  );
}
