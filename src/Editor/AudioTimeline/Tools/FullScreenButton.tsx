import Maximize from "@spectrum-icons/workflow/Maximize";
import { ActionButton } from "@adobe/react-spectrum";
import {
  exitDocumentFullscreen,
  isDocumentFullscreen,
  requestDocumentFullscreen,
} from "../../../utils";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../../../theme";

export default function FullScreenButton() {
  return (
    <ActionButton
      aria-label="Toggle fullscreen"
      isQuiet
      UNSAFE_className={HEADER_BUTTON_CLASS}
      UNSAFE_style={headerButtonStyle(false)}
      width={"size-10"}
      onPress={() => toggle_full_screen()}
    >
      <Maximize />
    </ActionButton>
  );
}

async function toggle_full_screen() {
  if (isDocumentFullscreen()) {
    await exitDocumentFullscreen();
    return;
  }

  await requestDocumentFullscreen();
}
