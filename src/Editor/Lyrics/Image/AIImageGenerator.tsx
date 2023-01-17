import { Button, View } from "@adobe/react-spectrum";
import { useAIImageService } from "./useAIImageService";

export default function AIImageGenerator() {
  const [generateImage] = useAIImageService(true);

  function onGeneratePress() {
    generateImage()
  }

  return (
    <View>
      <Button variant="accent" onPress={onGeneratePress}>
        Generate
      </Button>
    </View>
  );
}
