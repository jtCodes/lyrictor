import {
  Button,
  ProgressCircle,
  View,
  Text,
  Flex,
  Grid,
  Divider,
  TextField,
  TextArea,
  Well,
  Picker,
  Item,
} from "@adobe/react-spectrum";
import { useEffect, useMemo, useState } from "react";
import MagicWand from "@spectrum-icons/workflow/MagicWand";
import Play from "@spectrum-icons/workflow/Play";
import AIImageGeneratorError from "./AIImageGeneratorError";
import GenerateImagesLog from "./GenerateImagesLog";
import PromptLogButton from "./PromptLogButton";
import { getImageFileUrl, useAIImageGeneratorStore } from "./store";
import { PredictParams, PromptParamsType } from "./types";
import { useAIImageService } from "./useAIImageService";
import {
  useOpenRouterImageService,
  OPENROUTER_IMAGE_MODELS,
  OpenRouterImageModelId,
  useModelPricing,
} from "./useOpenRouterImageService";
import { useOpenRouterStore } from "../../../api/openRouterStore";
import { startOpenRouterAuth } from "../../../api/openRouter";
import { usePromptSuggestion } from "./usePromptSuggestion";

export default function AIImageGenerator() {
  const [generateImage, isLoading, checkIfLocalAIRunning, isLocalAIRunning] =
    useAIImageService(true);
  const openRouterService = useOpenRouterImageService();
  const isOpenRouterAuth = useOpenRouterStore((state) => state.apiKey) !== null;
  const clearOpenRouterKey = useOpenRouterStore((state) => state.clearApiKey);
  const promptSuggestion = usePromptSuggestion();
  const { getLabel } = useModelPricing();

  const activeProvider = useAIImageGeneratorStore(
    (state) => state.activeProvider
  );
  const setActiveProvider = useAIImageGeneratorStore(
    (state) => state.setActiveProvider
  );
  const setCurrentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.setCurrentGenFileUrl
  );
  const setCurrentGenFileUrlDirect = useAIImageGeneratorStore(
    (state) => state.setCurrentGenFileUrlDirect
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

  const [selectedModel, setSelectedModel] =
    useState<OpenRouterImageModelId>("google/gemini-2.5-flash-image");

  const isGenerateEnabled: boolean = useMemo(() => {
    return Boolean(prompt.prompt);
  }, [prompt]);

  const isGenerating = isLoading || openRouterService.isLoading;
  const isAnyLoading = isGenerating || promptSuggestion.isLoading;

  useEffect(() => {
    checkIfLocalAIRunning();
  }, []);

  // Auto-select provider based on availability
  useEffect(() => {
    if (isOpenRouterAuth) {
      setActiveProvider("openrouter");
    } else if (isLocalAIRunning) {
      setActiveProvider("local");
    }
  }, [isOpenRouterAuth, isLocalAIRunning]);

  async function onGeneratePress() {
    if (activeProvider === "openrouter") {
      await onGenerateOpenRouter();
    } else {
      await onGenerateLocal();
    }
  }

  async function onGenerateLocal() {
    const resp = await generateImage(prompt);
    const name = resp.data[0][0].name;
    setCurrentGenFileUrl(name);
    const genPrompt = resp.data[1] as PredictParams;
    setCurrentGenParams(genPrompt);
    logPrompt(genPrompt);
    logGenerateImage({ url: getImageFileUrl(name), prompt: genPrompt });
    setSelectedImageLogItem({ url: getImageFileUrl(name), prompt: genPrompt });
  }

  async function onGenerateOpenRouter() {
    const result = await openRouterService.generateImage(
      prompt.prompt,
      selectedModel
    );
    if (result) {
      const imageUrl = result.imageDataUrl;
      setCurrentGenFileUrlDirect(imageUrl);
      logPrompt(prompt);
      const meta = { prompt: prompt.prompt, model: selectedModel };
      logGenerateImage({ url: imageUrl, prompt: meta });
      setSelectedImageLogItem({ url: imageUrl, prompt: meta });
    }
  }

  function handleSeedFieldChange(value: string) {
    updatePrompt(
      PromptParamsType.seed,
      Number(value) === 0 ? -1 : Number(value)
    );
  }

  const noProviderAvailable = !isOpenRouterAuth && !isLocalAIRunning;

  if (noProviderAvailable) {
    return <AIImageGeneratorError />;
  }

  return (
    <View>
      <Flex gap="size-200" marginBottom="size-200" alignItems="end">
        {isOpenRouterAuth && isLocalAIRunning ? (
          <Picker
            label="Provider"
            selectedKey={activeProvider}
            onSelectionChange={(key: any) => setActiveProvider(key)}
          >
            <Item key="openrouter">OpenRouter</Item>
            <Item key="local">Local Stable Diffusion</Item>
          </Picker>
        ) : null}
        {activeProvider === "openrouter" ? (
          <>
            <Picker
              label="Model"
              selectedKey={selectedModel}
              onSelectionChange={(key: any) => setSelectedModel(key)}
            >
              {OPENROUTER_IMAGE_MODELS.map((m) => (
                <Item key={m.id}>{getLabel(m)}</Item>
              ))}
            </Picker>
            <Button
              variant="secondary"
              onPress={() => {
                clearOpenRouterKey();
              }}
            >
              <Text>Sign Out</Text>
            </Button>
          </>
        ) : null}
      </Flex>
      {openRouterService.error ? (
        <View marginBottom="size-100">
          <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)" }}>
            {openRouterService.error}
          </Text>
        </View>
      ) : null}
      <Grid
        areas={["sidebar content"]}
        columns={["2fr", "1fr"]}
        rows={["100%"]}
        height="68vh"
        gap="size-100"
      >
        <Flex
          direction="column"
          gridArea="sidebar"
          UNSAFE_style={{
            borderColor: "var(--spectrum-global-color-gray-300)",
            borderWidth: "2px",
            borderStyle: "solid",
            borderRadius: "var(--spectrum-alias-border-radius-regular)",
            padding: "var(--spectrum-global-dimension-size-200)",
            overflow: "hidden",
          }}
        >
          <Flex direction={"column"} gap={"size-200"} UNSAFE_style={{ flex: "1 1 0", minHeight: 0 }}>
            <View flexShrink={0}>
              <Flex gap="size-200" alignItems="center">
                <Flex direction="column" flex gap="size-50">
                  <TextArea
                    width="100%"
                    aria-label="Prompt"
                    placeholder="Enter prompt"
                    value={prompt?.prompt}
                    onChange={(value) => {
                      updatePrompt(PromptParamsType.prompt, value);
                    }}
                    height={70}
                  />
                  <Flex gap="size-100" alignItems="center">
                    {activeProvider === "openrouter" && promptSuggestion.isAvailable ? (
                      <Button
                        variant="secondary"
                        isDisabled={isAnyLoading}
                        isQuiet
                        onPress={async () => {
                          const suggested = await promptSuggestion.generatePrompt(
                            prompt.prompt || undefined
                          );
                          if (suggested) {
                            updatePrompt(PromptParamsType.prompt, suggested);
                          }
                        }}
                      >
                        {promptSuggestion.isLoading ? (
                          <ProgressCircle
                            aria-label="Suggesting…"
                            isIndeterminate
                            size="S"
                          />
                        ) : (
                          <><MagicWand size="S" /><Text>Suggest</Text></>
                        )}
                      </Button>
                    ) : null}
                    <PromptLogButton />
                  </Flex>
                </Flex>
                <Button
                  variant="accent"
                  onPress={onGeneratePress}
                  isDisabled={isAnyLoading || !isGenerateEnabled}
                  width={"130px"}
                >
                  {isGenerating ? (
                    <ProgressCircle
                      aria-label="Loading…"
                      isIndeterminate
                      size="S"
                      marginEnd={5}
                    />
                  ) : (
                    <Play size="S" />
                  )}
                  <Text>Generate</Text>
                </Button>
              </Flex>
            </View>
                {activeProvider === "local" ? (
                  <View flexShrink={0}>
                    <TextField
                      label="seed"
                      value={prompt.seed < 0 ? "" : String(prompt.seed)}
                      type={"number"}
                      onChange={handleSeedFieldChange}
                    />
                  </View>
                ) : null}
                {currentGenFileUrl ? (
                  <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img
                      style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                      src={currentGenFileUrl}
                      alt=""
                    />
                  </div>
                ) : null}
                {currentGenParams ? (
                  <Well flexShrink={0}>
                    <Text>Seed: {currentGenParams.seed}</Text>
                  </Well>
                ) : null}
          </Flex>
        </Flex>
        <Flex
          direction="column"
          gridArea="content"
          UNSAFE_style={{
            borderColor: "var(--spectrum-global-color-gray-300)",
            borderWidth: "2px",
            borderStyle: "solid",
            borderRadius: "var(--spectrum-alias-border-radius-regular)",
            padding: "var(--spectrum-global-dimension-size-200)",
            overflow: "hidden",
          }}
        >
          <GenerateImagesLog height="calc(68vh - 310px)" />
          <Divider size="S" marginBottom={"size-100"} marginTop={"size-100"} />
          {selectedImageLogItem ? (
            <>
              <Flex justifyContent={"space-between"} marginBottom={"size-50"} flexShrink={0}>
                <Text>
                  <span style={{ fontWeight: 600 }}>Selected Image</span>
                </Text>
                {"seed" in selectedImageLogItem.prompt ? (
                  <Text>seed: {selectedImageLogItem.prompt.seed}</Text>
                ) : (
                  <Text UNSAFE_style={{ fontSize: "12px" }}>
                    {selectedImageLogItem.prompt.model}
                  </Text>
                )}
              </Flex>
              <View
                flex
                overflow="hidden"
                minHeight={0}
              >
                <img
                  width={"100%"}
                  height={"100%"}
                  style={{ objectFit: "contain" }}
                  src={selectedImageLogItem.url}
                  alt=""
                />
              </View>
            </>
          ) : null}
        </Flex>
      </Grid>
    </View>
  );
}
