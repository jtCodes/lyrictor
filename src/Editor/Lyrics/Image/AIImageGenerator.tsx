import {
  Button,
  ProgressCircle,
  View,
  Text,
  Flex,
  TextArea,
  Grid,
  Divider,
} from "@adobe/react-spectrum";
import GenerateImageLogButton from "./GeneratedImageLogButton";
import GenerateImagesLog from "./GenerateImagesLog";
import PromptLogButton from "./PromptLogButton";
import { getImageFileUrl, useAIImageGeneratorStore } from "./store";
import { useAIImageService } from "./useAIImageService";

export default function AIImageGenerator() {
  const [generateImage, isLoading] = useAIImageService(true);
  const setCurrentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.setCurrentGenFileUrl
  );
  const currentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.currentGenFileUrl
  );
  const prompt = useAIImageGeneratorStore((state) => state.prompt);
  const setPrompt = useAIImageGeneratorStore((state) => state.setPrompt);
  const logPrompt = useAIImageGeneratorStore((state) => state.logPrompt);
  const logGenerateImage = useAIImageGeneratorStore(
    (state) => state.logGeneratedImage
  );
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );
  const setSelectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.setSelectedImageLogTiem
  );

  async function onGeneratePress() {
    if (prompt) {
      const resp = await generateImage(prompt);
      const name = resp.data[0][0].name;
      setCurrentGenFileUrl(name);
      logPrompt(prompt);
      logGenerateImage({ url: getImageFileUrl(name), prompt });

      setSelectedImageLogItem({ url: getImageFileUrl(name), prompt });
    }
  }

  return (
    <View>
      <Grid
        areas={["sidebar content"]}
        columns={["2fr", "1fr"]}
        rows={["100%"]}
        height="75vh"
        gap="size-100"
      >
        <View
          gridArea="sidebar"
          borderColor={"gray-300"}
          borderWidth={"thick"}
          borderRadius={"medium"}
          padding={"size-200"}
          overflow={"autoY"}
        >
          <Flex direction={"column"} gap={"size-200"}>
            <View>
              <Flex gap="size-200">
                <div
                  className="spectrum-Textfield spectrum-Textfield--multiline is-focused"
                  style={{ width: "100%" }}
                >
                  <textarea
                    role={"textbox"}
                    placeholder="Enter prompt"
                    name="field"
                    className="spectrum-Textfield-input_73bc77"
                    value={prompt}
                    onChange={(e: any) => {
                      setPrompt(e.target.value);
                    }}
                    style={{ height: 70 }}
                  ></textarea>
                </div>
                <View alignSelf={"center"}>
                  <Button
                    variant="accent"
                    onPress={onGeneratePress}
                    isDisabled={isLoading}
                    width={"130px"}
                    marginBottom={"size-100"}
                  >
                    {isLoading ? (
                      <ProgressCircle
                        aria-label="Loading…"
                        isIndeterminate
                        size="S"
                        marginEnd={5}
                      />
                    ) : null}
                    <Text>Generate</Text>
                  </Button>
                  <Flex justifyContent={"space-between"}>
                    <PromptLogButton />
                  </Flex>
                </View>
              </Flex>
            </View>
            <View>
              {currentGenFileUrl ? (
                <>
                  <View alignSelf={"center"} width={368} height={212}>
                    <img
                      className="w-full object-contain h-[calc(100%-50px)"
                      width={"100%"}
                      height={"100%"}
                      style={{ objectFit: "cover" }}
                      src={currentGenFileUrl}
                      alt=""
                      data-modded="true"
                    />
                  </View>
                </>
              ) : null}
            </View>
          </Flex>
        </View>
        <View
          gridArea="content"
          borderColor={"gray-300"}
          borderWidth={"thick"}
          borderRadius={"medium"}
          padding={"size-200"}
        >
          <GenerateImagesLog height="calc(75vh - 310px)" />
          <Divider size="S" marginBottom={"size-100"} marginTop={"size-100"} />
          {selectedImageLogItem ? (
            <>
              <Text>
                <span style={{ fontWeight: 600 }}>Selected Image</span>
              </Text>
              <View alignSelf={"center"} height={200} marginTop={"size-50"}>
                <img
                  className="w-full object-contain h-[calc(100%-50px)"
                  width={"100%"}
                  height={"100%"}
                  style={{ objectFit: "cover" }}
                  src={selectedImageLogItem.url}
                  alt=""
                  data-modded="true"
                />
              </View>
            </>
          ) : null}
        </View>
      </Grid>
    </View>
  );
}
