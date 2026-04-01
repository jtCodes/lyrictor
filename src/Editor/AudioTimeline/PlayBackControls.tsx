import { ActionButton, Button, Flex } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../theme";

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
        width="size-10"
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={props.onPlayPauseClicked}
      >
        {props.isPlaying ? (
          <Pause size="S" />
        ) : (
          <Play size="S" />
        )}
      </ActionButton>
    </Flex>
  );
}
