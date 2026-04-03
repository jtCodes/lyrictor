import {
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  Item,
  Picker,
  ProgressCircle,
  Text,
  TextArea,
  View,
  Divider,
} from "@adobe/react-spectrum";
import { ToastQueue } from "@react-spectrum/toast";
import { useMemo, useState } from "react";
import { useAudioPosition } from "react-use-audio-player";
import { authenticateWithOpenRouter } from "../../api/openRouter";
import { useOpenRouterStore } from "../../api/openRouterStore";
import { useProjectStore } from "../../Project/store";
import { useProjectService } from "../../Project/useProjectService";
import { useEditorStore } from "../store";
import { useAIImageGeneratorStore } from "../Image/AI/store";
import { isTextItem } from "../utils";
import {
  AI_STARTING_POINT_ELEMENT_ADDONS,
  AI_STARTING_POINT_MODEL,
  AI_STARTING_POINT_MODELS,
  buildElementItemsFromStartingPointDraft,
  buildLyricTextsFromStartingPointDraft,
  getStartingPointDurationSeconds,
  replaceTextItems,
  resolveStartingPointSource,
} from "./startingPoint";
import { useAIStartingPointGenerator } from "./useAIStartingPointGenerator";
import { useOpenRouterTextModelPricing } from "./useOpenRouterTextModelPricing";
import { ElementType } from "../types";

type AIStartingPointModelOption = {
  id: string;
  label: string;
};

function formatUsageCost(cost: number) {
  return `$${cost.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;
}

function SourceBadge({ label }: { label: string }) {
  return (
    <View
      UNSAFE_style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(255, 255, 255, 0.07)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
      }}
    >
      <Text UNSAFE_style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.84)" }}>
        {label}
      </Text>
    </View>
  );
}

function SourceSummary({
  source,
  durationSeconds,
}: {
  source: ReturnType<typeof resolveStartingPointSource>;
  durationSeconds?: number;
}) {
  const summaryText = !source
    ? "No lyric source is available yet. Use lyric reference text or sync LRCLIB first."
    : source.type === "lrclib-synced" && source.timelineOffsetSeconds !== undefined
      ? `${source.lineCount} lyric line${source.lineCount === 1 ? "" : "s"} available in the current ${(
          source.clipDurationSeconds ?? durationSeconds ?? 0
        ).toFixed(1)}s timeline window${source.timelineOffsetSeconds > 0 ? `, offset ${source.timelineOffsetSeconds.toFixed(1)}s into the song` : ""}${source.fullSongDurationSeconds ? `. Full song length ${source.fullSongDurationSeconds.toFixed(1)}s.` : "."}`
      : `${source.lineCount} lyric line${source.lineCount === 1 ? "" : "s"} available${durationSeconds ? ` across ${durationSeconds.toFixed(1)}s` : ""}.`;

  return (
    <View
      UNSAFE_style={{
        padding: 12,
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.035)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
      }}
    >
      <Flex direction="column" gap="size-100">
        <Flex direction="row" justifyContent="space-between" alignItems="center" gap="size-100" wrap>
          <Text UNSAFE_style={{ fontWeight: 600, fontSize: 12, color: "rgba(255, 255, 255, 0.74)" }}>
            Source
          </Text>
          {source ? <SourceBadge label={source.label} /> : null}
        </Flex>
        <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.62)", fontSize: 12, lineHeight: 1.5 }}>
          {summaryText}
        </Text>
      </Flex>
    </View>
  );
}

export default function AIStartingPointView() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const lyricReference = useProjectStore((state) => state.unSavedLyricReference ?? state.lyricReference);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const previewContainerRef = useEditorStore((state) => state.previewContainerRef);
  const setApiKey = useOpenRouterStore((state) => state.setApiKey);
  const [saveProject] = useProjectService();
  const generator = useAIStartingPointGenerator();
  const { getLabel, pricing } = useOpenRouterTextModelPricing();
  const [direction, setDirection] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(AI_STARTING_POINT_MODEL);
  const [enabledAddOns, setEnabledAddOns] = useState<ElementType[]>([]);
  const [lastSummary, setLastSummary] = useState<string | undefined>();
  const { duration } = useAudioPosition({ highRefreshRate: false });

  const source = useMemo(
    () =>
      resolveStartingPointSource({
        editingProject,
        lyricReference,
        clipDurationSeconds: duration,
      }),
    [duration, editingProject, lyricReference]
  );
  const durationSeconds = useMemo(
    () => getStartingPointDurationSeconds({ editingProject, playbackDurationSeconds: duration }),
    [duration, editingProject]
  );
  const modelOptions = useMemo<AIStartingPointModelOption[]>(
    () =>
      AI_STARTING_POINT_MODELS.map((model) => ({
        id: model.id,
        label: getLabel(model),
      })),
    [getLabel, pricing]
  );

  async function handleSignIn() {
    const key = await authenticateWithOpenRouter();
    if (key) {
      setApiKey(key);
    }
  }

  async function handleGenerateAndApply() {
    if (!editingProject) {
      ToastQueue.negative("Open a project before generating a starting point", {
        timeout: 3000,
      });
      return;
    }

    if (!source) {
      ToastQueue.negative("Add lyric reference text or sync LRCLIB lyrics first", {
        timeout: 3500,
      });
      return;
    }

    if (!durationSeconds || durationSeconds <= 0) {
      ToastQueue.negative("Song duration is unavailable", {
        timeout: 3000,
      });
      return;
    }

    const trimmedDirection = direction.trim();
    if (trimmedDirection.length === 0) {
      ToastQueue.negative("Describe how you want the project to feel first", {
        timeout: 3000,
      });
      return;
    }

    try {
      const draft = await generator.generateStartingPoint({
        direction: trimmedDirection,
        durationSeconds,
        project: editingProject,
        source,
        model: selectedModel,
        allowedElementTypes: enabledAddOns,
      });

      const previewSize = previewContainerRef
        ? {
            width: Math.max(1, previewContainerRef.clientWidth),
            height: Math.max(1, previewContainerRef.clientHeight),
          }
        : undefined;
      const preservedItems = lyricTexts.filter((item) => !isTextItem(item));
      const nextTextItems = buildLyricTextsFromStartingPointDraft({
        draft,
        durationSeconds,
        occupiedTimelineItems: preservedItems,
        previewSize,
      });
      const nextElementItems = await buildElementItemsFromStartingPointDraft({
        draft,
        durationSeconds,
        existingItems: preservedItems,
        albumArtSrc: editingProject.albumArtSrc,
        allowedElementTypes: enabledAddOns,
      });

      if (nextTextItems.length === 0 && nextElementItems.length === 0) {
        ToastQueue.negative("AI output did not produce any usable lyric or element items", {
          timeout: 3500,
        });
        return;
      }

      const nextLyricTexts = replaceTextItems(lyricTexts, [
        ...nextTextItems,
        ...nextElementItems,
      ]);
      setLyricTexts(nextLyricTexts);
      setLastSummary(draft.summary);

      const projectState = useProjectStore.getState();
      const aiImageState = useAIImageGeneratorStore.getState();

      await saveProject({
        id: editingProject.name,
        projectDetail: editingProject,
        lyricTexts: projectState.lyricTexts,
        lyricReference: projectState.unSavedLyricReference ?? projectState.lyricReference,
        generatedImageLog: aiImageState.generatedImageLog,
        promptLog: aiImageState.promptLog,
        images: projectState.images,
      });

      ToastQueue.positive(
        `Applied ${nextTextItems.length} lyric item${nextTextItems.length === 1 ? "" : "s"}${nextElementItems.length > 0 ? ` and ${nextElementItems.length} element${nextElementItems.length === 1 ? "" : "s"}` : ""}`,
        { timeout: 3500 }
      );
    } catch (error) {
      console.error("Failed to generate AI starting point", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate AI starting point";
      ToastQueue.negative(message, { timeout: 4000 });
    }
  }

  const canGenerate = Boolean(
    editingProject &&
      source &&
      durationSeconds &&
      durationSeconds > 0 &&
      direction.trim().length > 0 &&
      generator.isAvailable
  );

  return (
    <View height="100%" overflow="hidden" UNSAFE_style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          padding: "18px 16px 20px",
        }}
      >
        <Flex direction="column" gap="size-200">
          {!generator.isAvailable ? (
            <View
              UNSAFE_style={{
                padding: 14,
                borderRadius: 16,
                background: "rgba(255, 255, 255, 0.035)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
              }}
            >
              <Flex direction="column" gap="size-125">
                <Text UNSAFE_style={{ fontWeight: 600 }}>
                  OpenRouter required
                </Text>
                <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.62)", lineHeight: 1.6 }}>
                  Sign in with OpenRouter to generate a structured starting-point draft.
                </Text>
                <Button variant="accent" onPress={handleSignIn} alignSelf="start">
                  Sign in with OpenRouter
                </Button>
              </Flex>
            </View>
          ) : null}

          {generator.isAvailable ? (
            <Picker
              label="Model"
              items={modelOptions}
              selectedKey={selectedModel}
              onSelectionChange={(key) => {
                if (key) {
                  setSelectedModel(String(key));
                }
              }}
            >
              {(model) => (
                <Item key={model.id} textValue={model.label}>
                  {model.label}
                </Item>
              )}
            </Picker>
          ) : null}

          {generator.isAvailable ? (
            <CheckboxGroup
              label="Add-ons"
              value={enabledAddOns}
              onChange={(value) => setEnabledAddOns(value as ElementType[])}
            >
              {AI_STARTING_POINT_ELEMENT_ADDONS.map((addon) => (
                <Checkbox key={addon.id} value={addon.id}>
                  {addon.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          ) : null}

          <TextArea
            label="Direction"
            placeholder="Example: keep the intro sparse, bring in fuller phrases at the chorus, and make the verses feel restrained and cinematic."
            value={direction}
            onChange={setDirection}
            height={132}
            width="100%"
          />

          <SourceSummary source={source} durationSeconds={durationSeconds} />

          <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.56)", fontSize: 12, lineHeight: 1.4 }}>
            Replaces text items only.
          </Text>

          {generator.error ? (
            <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-500)", lineHeight: 1.5 }}>
              {generator.error}
            </Text>
          ) : null}

          {lastSummary || typeof generator.lastUsage?.cost === "number" ? (
            <>
              <Divider size="S" />
              <View>
                <Flex direction="column" gap="size-75">
                  <Text UNSAFE_style={{ fontWeight: 600 }}>Last generate</Text>
                  {typeof generator.lastUsage?.cost === "number" ? (
                    <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.68)", fontSize: 12, lineHeight: 1.4 }}>
                      {`Cost ${formatUsageCost(generator.lastUsage.cost)}`}
                    </Text>
                  ) : null}
                  {lastSummary ? (
                    <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.64)", lineHeight: 1.6 }}>
                      {lastSummary}
                    </Text>
                  ) : null}
                </Flex>
              </View>
            </>
          ) : null}
        </Flex>
      </div>

      <View
        paddingX="size-200"
        paddingTop={8}
        paddingBottom={8}
        UNSAFE_style={{
          flexShrink: 0,
          background:
            "linear-gradient(180deg, rgba(18, 20, 22, 0.72), rgba(18, 20, 22, 0.92))",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        }}
      >
        <Flex justifyContent="space-between" alignItems="center" gap={8}>
          <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.62)", fontSize: 12, lineHeight: 1.3, flex: 1 }}>
            {generator.isLoading ? "Generating..." : "Lyrics only"}
          </Text>
          <Button
            variant="accent"
            onPress={handleGenerateAndApply}
            isDisabled={!canGenerate}
            UNSAFE_style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {generator.isLoading ? (
              <ProgressCircle aria-label="Generating starting point" isIndeterminate size="S" />
            ) : (
              "Generate + Apply"
            )}
          </Button>
        </Flex>
      </View>
    </View>
  );
}