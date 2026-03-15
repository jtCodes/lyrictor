import { ActionButton } from "@adobe/react-spectrum";
import { useEditorStore } from "../../store";
import GraphBullet from "@spectrum-icons/workflow/GraphBullet";

export default function CustomizationPanelButton() {
  const isCustomizationPanelOpen = useEditorStore(
    (state) => state.isCustomizationPanelOpen
  );
  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );

  function onPress() {
    toggleCustomizationPanelState();
  }

  return (
    <ActionButton
      aria-label={
        isCustomizationPanelOpen
          ? "Hide customization panel"
          : "Show customization panel"
      }
      isQuiet={!isCustomizationPanelOpen}
      width={"size-10"}
      onPress={onPress}
    >
      <GraphBullet />
    </ActionButton>
  );
}
