import {
  Button,
  ProgressCircle,
  View,
  Text,
  Flex,
  Grid,
  Divider,
  TextField,
  Well,
} from "@adobe/react-spectrum";
import { useMemo } from "react";
import GenerateImagesLog from "./GenerateImagesLog";
import PromptLogButton from "./PromptLogButton";
import { getImageFileUrl, useAIImageGeneratorStore } from "./store";
import { PredictParams, PromptParamsType } from "./types";
import { useAIImageService } from "./useAIImageService";

export default function AIImageGenerator() {
  const [generateImage, isLoading] = useAIImageService(true);
  const setCurrentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.setCurrentGenFileUrl
  );
  const currentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.currentGenFileUrl
  );
  const currentGenParams = useAIImageGeneratorStore(
    (state) => state.currentGenParams
  );
  const setCurrentGenParams = useAIImageGeneratorStore(
    (state) => state.setCurrentGenParams
  );
  const prompt = useAIImageGeneratorStore((state) => state.prompt);
  const updatePrompt = useAIImageGeneratorStore((state) => state.updatePrompt);
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

  const isGenerateEnabled: boolean = useMemo(() => {
    return Boolean(prompt.prompt);
  }, [prompt]);

  async function onGeneratePress() {
    const resp = await generateImage(prompt);
    const name = resp.data[0][0].name;
    setCurrentGenFileUrl(name);
    setCurrentGenParams(resp.data[1] as PredictParams);
    logPrompt(prompt);
    logGenerateImage({ url: getImageFileUrl(name), prompt });

    setSelectedImageLogItem({ url: getImageFileUrl(name), prompt });
  }

  function handleSeedFieldChange(value: string) {
    updatePrompt(
      PromptParamsType.seed,
      Number(value) === 0 ? -1 : Number(value)
    );
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
                    value={prompt?.prompt}
                    onChange={(e: any) => {
                      updatePrompt(PromptParamsType.prompt, e.target.value);
                    }}
                    style={{ height: 70 }}
                  ></textarea>
                </div>
                <View alignSelf={"center"}>
                  <Button
                    variant="accent"
                    onPress={onGeneratePress}
                    isDisabled={isLoading || !isGenerateEnabled}
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
              <Flex direction={"column"} gap={"size-200"}>
                <View>
                  <TextField
                    label="seed"
                    value={prompt.seed < 0 ? "" : String(prompt.seed)}
                    type={"number"}
                    onChange={handleSeedFieldChange}
                  />
                </View>
                {currentGenFileUrl && currentGenParams ? (
                  <View width={368} height={212}>
                    <img
                      className="w-full object-contain h-[calc(100%-50px)"
                      width={"100%"}
                      height={"100%"}
                      style={{ objectFit: "cover" }}
                      src={currentGenFileUrl}
                      alt=""
                      data-modded="true"
                    />
                    <Well>
                      <Text>Seed: {currentGenParams.seed}</Text>
                    </Well>
                  </View>
                ) : null}
              </Flex>
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
