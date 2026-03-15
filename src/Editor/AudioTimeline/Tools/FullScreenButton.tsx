import Maximize from "@spectrum-icons/workflow/Maximize";
import { ActionButton } from "@adobe/react-spectrum";
import {
  exitDocumentFullscreen,
  isDocumentFullscreen,
  requestDocumentFullscreen,
} from "../../../utils";

export default function FullScreenButton() {
  return (
    <ActionButton
      aria-label="Toggle fullscreen"
      isQuiet
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
