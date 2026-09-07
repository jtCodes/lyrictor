import Maximize from "@spectrum-icons/workflow/Maximize";
import Minimize from "@spectrum-icons/workflow/Minimize";
import { ActionButton, Tooltip, TooltipTrigger } from "@adobe/react-spectrum";
import { ToastQueue } from "@react-spectrum/toast";
import {
  exitDocumentFullscreen,
  isDocumentFullscreen,
  requestDocumentFullscreen,
  useIsFullscreen,
} from "../../../utils";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../../../theme";

export default function FullScreenButton({ compact = false }: { compact?: boolean }) {
  const isFullscreen = useIsFullscreen();
  const label = isFullscreen ? "Exit fullscreen" : "Fullscreen video";
  const Icon = isFullscreen ? Minimize : Maximize;

  return (
    <TooltipTrigger delay={150}>
      <ActionButton
        aria-label={label}
        aria-pressed={isFullscreen}
        isQuiet
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={{
          ...headerButtonStyle(isFullscreen),
          ...(compact ? {
            width: 30,
            minWidth: 30,
            height: 30,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          } : {}),
        }}
        width={compact ? undefined : "size-10"}
        onPress={() => {
          toggle_full_screen().catch(() => {
            ToastQueue.negative("Could not change fullscreen. Please try again.", { timeout: 5000 });
          });
        }}
      >
        <Icon UNSAFE_style={compact ? { width: 15, height: 15 } : undefined} />
      </ActionButton>
      <Tooltip>{label}{isFullscreen ? " (Esc)" : ""}</Tooltip>
    </TooltipTrigger>
  );
}

async function toggle_full_screen() {
  if (isDocumentFullscreen()) {
    await exitDocumentFullscreen();
    return;
  }

  await requestDocumentFullscreen();
}
