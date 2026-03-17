import { View, Flex, Image, Text, ActionButton, Tooltip, TooltipTrigger } from "@adobe/react-spectrum";
import { useState } from "react";
import Cloud from "@spectrum-icons/workflow/Cloud";
import CloudOutline from "@spectrum-icons/workflow/CloudOutline";
import DeleteImageButton from "./DeleteImageButton";
import { useAIImageGeneratorStore } from "./store";
import { useAuthStore } from "../../../Auth/store";
import { useProjectStore } from "../../../Project/store";
import { uploadBase64Image } from "../../../Project/firestoreProjectService";

function isBase64DataUrl(url: string): boolean {
  return url.startsWith("data:");
}

export default function GenerateImagesLog({ height }: { height: string }) {
  const generatedImageLog = useAIImageGeneratorStore(
    (state) => state.generatedImageLog
  );
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );
  const setSelectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.setSelectedImageLogTiem
  );
  const updateGeneratedImage = useAIImageGeneratorStore(
    (state) => state.updateGeneratedImage
  );
  const user = useAuthStore((state) => state.user);
  const editingProject = useProjectStore((state) => state.editingProject);
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);

  async function handleSaveToCloud(image: typeof generatedImageLog[0]) {
    if (!user || !editingProject || !isBase64DataUrl(image.url)) return;
    setUploadingUrl(image.url);
    try {
      const downloadUrl = await uploadBase64Image(
        user.uid,
        editingProject.name,
        image.url,
        Date.now()
      );
      updateGeneratedImage(image.url, { ...image, url: downloadUrl });
    } catch (e) {
      console.error("Failed to upload image:", e);
    } finally {
      setUploadingUrl(null);
    }
  }

  return (
    <View>
      <View paddingTop={"size50"} paddingBottom={"size-50"} height={"30px"}>
        <Flex justifyContent={"space-between"}>
          <Text>
            <span style={{ fontWeight: "600" }}>Image Log</span>
          </Text>
          {selectedImageLogItem ? <DeleteImageButton /> : null}
        </Flex>
      </View>
      <View overflow={"auto"} height={height} marginTop={"size-50"}>
        <Flex marginTop={"size-100"} wrap={"wrap"} gap={"size-150"}>
          {generatedImageLog.filter((image) => image.url).map((image) => (
            <div
              key={image.url}
              style={{ position: "relative" }}
              onClick={() => {
                setSelectedImageLogItem(image);
              }}
            >
              <View
                borderColor={
                  selectedImageLogItem?.url === image.url
                    ? "yellow-400"
                    : undefined
                }
                borderWidth={"thick"}
                borderRadius={"small"}
                overflow={"hidden"}
              >
                <Image
                  key={image.url}
                  width={"130px"}
                  src={image.url}
                  alt="Generated image"
                />
              </View>
              <div style={{ position: "absolute", top: 4, right: 4 }}>
                {isBase64DataUrl(image.url) && user && editingProject ? (
                  <TooltipTrigger delay={0}>
                    <ActionButton
                      isQuiet
                      isDisabled={uploadingUrl === image.url}
                      onPress={() => {
                        handleSaveToCloud(image);
                      }}
                      aria-label="Save to cloud"
                      UNSAFE_style={{ background: "rgba(0,0,0,0.5)", borderRadius: 4 }}
                    >
                      <CloudOutline size="S" />
                    </ActionButton>
                    <Tooltip>Save to cloud</Tooltip>
                  </TooltipTrigger>
                ) : !isBase64DataUrl(image.url) ? (
                  <Cloud size="S" UNSAFE_style={{ color: "var(--spectrum-global-color-green-500)" }} />
                ) : null}
              </div>
            </div>
          ))}
        </Flex>
      </View>
    </View>
  );
}
