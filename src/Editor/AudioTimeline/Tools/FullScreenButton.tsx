import Maximize from "@spectrum-icons/workflow/Maximize";
import { ActionButton } from "@adobe/react-spectrum";

export default function FullScreenButton() {
  return (
    <ActionButton
      isQuiet
      width={"size-10"}
      onPress={() => toggle_full_screen()}
    >
      <Maximize />
    </ActionButton>
  );
}

function toggle_full_screen() {
  const documentAny = document as any;
  const elementAny = Element as any;
  if (
    (documentAny.fullScreenElement && documentAny.fullScreenElement !== null) ||
    (!documentAny.mozFullScreen && !documentAny.webkitIsFullScreen)
  ) {
    if (documentAny.documentElement.requestFullScreen) {
      documentAny.documentElement.requestFullScreen();
    } else if (documentAny.documentElement.mozRequestFullScreen) {
      /* Firefox */
      documentAny.documentElement.mozRequestFullScreen();
    } else if (documentAny.documentElement.webkitRequestFullScreen) {
      /* Chrome, Safari & Opera */
      documentAny.documentElement.webkitRequestFullScreen(
        elementAny.ALLOW_KEYBOARD_INPUT
      );
    } else if (documentAny.msRequestFullscreen) {
      /* IE/Edge */
      documentAny.documentElement.msRequestFullscreen();
    }
  } else {
    if (documentAny.cancelFullScreen) {
      documentAny.cancelFullScreen();
    } else if (documentAny.mozCancelFullScreen) {
      /* Firefox */
      documentAny.mozCancelFullScreen();
    } else if (documentAny.webkitCancelFullScreen) {
      /* Chrome, Safari and Opera */
      documentAny.webkitCancelFullScreen();
    } else if (documentAny.msExitFullscreen) {
      /* IE/Edge */
      documentAny.msExitFullscreen();
    }
  }
}
