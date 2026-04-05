import { ActionButton, Flex, View } from "@adobe/react-spectrum";
import { useEditorStore } from "../../store";
import { headerButtonStyle } from "../../../theme";

export const PREVIEW_ACTION_ROW_HEIGHT = 40;

export default function PreviewActionRow({
  width,
}: {
  width: number;
}) {
  const showAllTextPreviewOverlay = useEditorStore(
    (state) => state.showAllTextPreviewOverlay
  );
  const setShowAllTextPreviewOverlay = useEditorStore(
    (state) => state.setShowAllTextPreviewOverlay
  );
  const showPreviewGrid = useEditorStore((state) => state.showPreviewGrid);
  const setShowPreviewGrid = useEditorStore((state) => state.setShowPreviewGrid);

  return (
    <View
      width={width}
      height={PREVIEW_ACTION_ROW_HEIGHT}
      paddingX="size-100"
      UNSAFE_style={{
        flexShrink: 0,
        background: "transparent",
      }}
    >
      <Flex alignItems="center" justifyContent="center" height="100%" gap="size-75">
        <ActionButton
          aria-label={
            showAllTextPreviewOverlay
              ? "Hide all lyric overlay"
              : "Show all lyric overlay"
          }
          isQuiet
          UNSAFE_style={{
            ...headerButtonStyle(showAllTextPreviewOverlay),
            width: 30,
            minWidth: 30,
            height: 30,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() =>
            setShowAllTextPreviewOverlay(!showAllTextPreviewOverlay)
          }
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2.25 3.25h11.5M2.25 6.5h11.5M2.25 9.75h7.25M2.25 13h7.25"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M11.2 9.2l2.55 2.55M13.75 9.2l-2.55 2.55"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
          </svg>
        </ActionButton>
        <ActionButton
          aria-label={showPreviewGrid ? "Hide preview grid" : "Show preview grid"}
          isQuiet
          UNSAFE_style={{
            ...headerButtonStyle(showPreviewGrid),
            width: 30,
            minWidth: 30,
            height: 30,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setShowPreviewGrid(!showPreviewGrid)}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1.5 1.5h13v13h-13z" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M4.75 1.5v13M8 1.5v13M11.25 1.5v13M1.5 4.75h13M1.5 8h13M1.5 11.25h13"
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.9"
            />
          </svg>
        </ActionButton>
      </Flex>
    </View>
  );
}