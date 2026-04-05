import { ActionButton, Flex, View } from "@adobe/react-spectrum";
import ViewGrid from "@spectrum-icons/workflow/ViewGrid";
import { useEditorStore } from "../../store";
import { headerButtonStyle } from "../../../theme";

export const PREVIEW_ACTION_ROW_HEIGHT = 40;

export default function PreviewActionRow({
  width,
}: {
  width: number;
}) {
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
          <ViewGrid size="S" />
        </ActionButton>
      </Flex>
    </View>
  );
}