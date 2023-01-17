import { useAIImageService } from "./useAIImageService";

export default function AIImageGenerator() {
  const [generateImage] = useAIImageService(true);

  return <div>AIImageGenerator</div>;
}
