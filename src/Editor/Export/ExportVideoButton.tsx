import { ActionButton } from "@adobe/react-spectrum";
import Export from "@spectrum-icons/workflow/Export";
import { createPortal } from "react-dom";
import { useVideoExport } from "../Export/useVideoExport";
import { useEditorStore } from "../store";
import { useProjectStore } from "../../Project/store";
import { VideoAspectRatio } from "../../Project/types";
import { DropdownMenuItem } from "../../components/DropdownMenu";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../theme";

export default function ExportVideoButton({
  duration,
  seek,
  play,
  pause,
  variant = "button",
}: {
  duration: number;
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  variant?: "button" | "menu-item";
}) {
  const { exportState, progress, startExport, cancelExport } =
    useVideoExport();
  const previewContainerRef = useEditorStore(
    (state) => state.previewContainerRef
  );
  const projectName = useProjectStore((state) => state.editingProject?.name);
  const resolution = useProjectStore(
    (state) => state.editingProject?.resolution
  );

  function handleExport() {
    if (exportState === "exporting") {
      cancelExport();
      return;
    }

    if (!previewContainerRef) {
      console.error("Preview container not available");
      return;
    }

    startExport(
      previewContainerRef,
      seek,
      play,
      pause,
      duration,
      projectName ?? "lyrictor-export",
      resolution ?? VideoAspectRatio["16/9"]
    );
  }

  return (
    <>
      {variant === "menu-item" ? (
        <DropdownMenuItem
          onClick={handleExport}
          disabled={duration <= 0 || exportState === "exporting"}
          icon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          }
        >
          {exportState === "exporting" ? "Exporting Video..." : "Export Video"}
        </DropdownMenuItem>
      ) : (
        <ActionButton
          aria-label="Export video"
          isQuiet
          onPress={handleExport}
          isDisabled={duration <= 0 || exportState === "exporting"}
          UNSAFE_className={HEADER_BUTTON_CLASS}
          UNSAFE_style={headerButtonStyle(false)}
        >
          <Export size="S" />
        </ActionButton>
      )}
      {exportState === "exporting" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <p
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: 600,
                    margin: 0,
                    fontFamily: "Inter Variable, Inter, sans-serif",
                  }}
                >
                  Exporting video…
                </p>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "rgba(0, 0, 0, 0.85)",
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontFamily: "Inter Variable, Inter, sans-serif",
                  }}
                >
                  Beta
                </span>
              </div>
              <div
                style={{
                  width: 240,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: "white",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: 13,
                  margin: 0,
                  fontFamily: "Inter Variable, Inter, sans-serif",
                }}
              >
                {Math.round(progress)}%
              </p>
              <button
                onClick={cancelExport}
                style={{
                  marginTop: 8,
                  padding: "8px 24px",
                  borderRadius: 6,
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: 14,
                  fontFamily: "Inter Variable, Inter, sans-serif",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
