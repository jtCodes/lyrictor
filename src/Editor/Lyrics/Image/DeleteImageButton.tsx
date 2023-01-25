import { Button, Text } from "@adobe/react-spectrum";
import { useProjectService } from "../../../Project/useProjectService";
import { useAIImageGeneratorStore } from "./store";
import Delete from "@spectrum-icons/workflow/Delete";

export default function DeleteImageButton() {
  const [saveProject] = useProjectService();
  const hideImage = useAIImageGeneratorStore((state) => state.hideImage);
  const selectedImage = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );

  function onPress() {
    if (selectedImage) {
      hideImage(selectedImage.url);
      saveProject();
    }
  }

  return (
    <Button variant="negative" onPress={onPress} style={"fill"}>
      <Delete size="S" />
    </Button>
  );
}
