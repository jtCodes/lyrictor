import LyrictorLoadingIndicator from "../../components/LyrictorLoadingIndicator";
import { ActionButton, Flex } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../theme";
import { usePlaybackPreparationState } from "../../Project/PlaybackPreparationProvider";

interface PlayBackControlsProps {
  isPlaying: boolean;
  onPlayPauseClicked: () => void;
}

export default function PlayPauseButton(props: PlayBackControlsProps) {
  const { preparing, queued } = usePlaybackPreparationState();
  const waiting = preparing && !props.isPlaying;
  const label = props.isPlaying ? "Pause playback" : waiting
    ? queued ? "Cancel queued playback" : "Play when preview is ready"
    : "Play playback";
  return (
    <Flex direction="row" justifyContent={"center"} gap="size-100">
      <ActionButton
        aria-label={label}
        isQuiet
        width="size-10"
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={headerButtonStyle(false)}
        onPress={props.onPlayPauseClicked}
      >
        {waiting ? (
          <LyrictorLoadingIndicator label="Preparing preview" compact />
        ) : props.isPlaying ? (
          <Pause size="S" />
        ) : (
          <Play size="S" />
        )}
      </ActionButton>
    </Flex>
  );
}
