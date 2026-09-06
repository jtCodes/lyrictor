import { Flex, View } from "@adobe/react-spectrum";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useMemo, useState } from "react";
import { Group, Layer, Rect, Stage } from "react-konva";
import { useAudioPlayer } from "react-use-audio-player";
import { useAudioPosition } from "../../AudioTimeline/useAudioPosition";
import { useProjectStore } from "../../../Project/store";
import { useEditorStore } from "../../store";
import { ElementType, LyricText } from "../../types";
import ImageSelectionOverlay, {
  DraggingImageState,
  RotatingImageState,
} from "../../Image/ImageSelectionOverlay";
import {
  getActiveNonTextItems,
  getCurrentCamera,
  getCurrentLyrics,
  getElementType,
  isImageItem,
  isItemRenderEnabled,
  isTextItem,
} from "../../utils";
import {
  getCameraDollyScale,
  getCameraFocusBlurRadius,
  getCameraLensProfile,
  getCameraTiltOffset,
  getCameraTruckOffset,
  getCameraZPositionScale,
  getRadialLensScale,
  normalizeCameraSettings,
} from "../../Camera/store";
import {
  getCameraFocusCues,
  getCameraFocusTargetsById,
} from "../../Camera/focusTarget";
import { resolveCameraSettingsAtPosition } from "../../Camera/overrides";
import ImagePreviewLayer from "../../Image/ImagePreviewLayer";
import GrainPreviewSurface from "../../Grain/GrainPreviewSurface";
import LightPreviewSurface from "../../Light/LightPreviewSurface";
import { LyricsTextView } from "./LyricsTextView";
import {
  AshFadePreview,
  getAshFadeTextRenderProps,
  getAshFadeTextOpacity,
} from "../Effects/AshFade/AshFadeEffect";
import { getTextBlurRenderProps } from "../Effects/Blur/BlurEffect";
import {
  getDirectionalFadeEffectsFromLyricText,
  getDirectionalFadeTextRenderProps,
} from "../Effects/DirectionalFade/DirectionalFadeEffect";
import { getFloatingTextOffset } from "../Effects/Floating/FloatingEffect";
import {
  getGlitchPrimaryTextOffset,
  getGlitchPrimaryTextOpacity,
  GlitchPreview,
} from "../Effects/Glitch/GlitchEffect";
import { getWaterDistortionRenderProps } from "../Effects/WaterDistortion/WaterDistortionEffect";
import MusicVisualizer from "../../Visualizer/AudioVisualizer";
import Particles from "../../Particles/Particles";
import VisualizerPreviewSurface from "../../Visualizer/VisualizerPreviewSurface";
import { EditingMode, VideoAspectRatio } from "../../../Project/types";
import PreviewWindowAlignGuide from "./PreviewWindowAlignGuide";
import { TimeSyncedLyrics } from "./LinearTimeSyncedLyricPreview";
import { resolveTextDragAlignment, DragGuide } from "./textDragAlignment";
import { AllTextPreviewOverlay } from "./AllTextPreviewOverlay";
import { PreviewGridOverlay } from "./PreviewGridOverlay";
import { getPreviewSize } from "./previewSizing";

interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DraggingTextState extends Dimensions {
  guides: DragGuide[];
}


function getRotationCoverageScale(
  rotation: number,
  width: number,
  height: number
) {
  if (width <= 0 || height <= 0 || rotation === 0) {
    return 1;
  }

  const radians = (rotation * Math.PI) / 180;
  const absoluteCosine = Math.abs(Math.cos(radians));
  const absoluteSine = Math.abs(Math.sin(radians));

  return Math.max(
    absoluteCosine + (height / width) * absoluteSine,
    absoluteCosine + (width / height) * absoluteSine
  );
}

function isTimelinePreviewTextItem(item: LyricText) {
  return (
    isTextItem(item) &&
    isItemRenderEnabled(item) &&
    item.text.trim().length > 0 &&
    item.end > item.start &&
    item.textBoxTimelineLevel >= 1
  );
}

export default function LyricPreview({
  maxHeight,
  maxWidth,
  resolution,
  isEditMode = true,
  editingMode = EditingMode.free,
  disableAnimation = false,
  hiddenElementTypes = [],
}: {
  maxHeight: number;
  maxWidth: number;
  resolution?: VideoAspectRatio;
  isEditMode?: boolean;
  editingMode?: EditingMode;
  disableAnimation?: boolean;
  hiddenElementTypes?: ElementType[];
}) {
  const { previewWidth, previewHeight } = usePreviewSize(
    maxWidth,
    maxHeight,
    resolution
  );

  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const hiddenElementTypeSet = useMemo(
    () => new Set(hiddenElementTypes),
    [hiddenElementTypes]
  );

  const { playing } = useAudioPlayer();
  const { position: livePosition } = useAudioPosition({
    highRefreshRate: !disableAnimation,
    active: !disableAnimation && playing,
  });

  const editingText = useEditorStore((state) => state.editingText);
  const clearEditingText = useEditorStore((state) => state.clearEditingText);
  const selectedLyricTextIds = useEditorStore(
    (state) => state.selectedLyricTextIds
  );

  const setSelectedTimelineTextIds = useEditorStore(
    (state) => state.setSelectedLyricTextIds
  );
  const toggleCustomizationPanelState = useEditorStore(
    (state) => state.toggleCustomizationPanelOpenState
  );
  const setCustomizationPanelTabId = useEditorStore(
    (state) => state.setCustomizationPanelTabId
  );
  const showAllTextPreviewOverlay = useEditorStore(
    (state) => state.showAllTextPreviewOverlay
  );
  const showPreviewGrid = useEditorStore((state) => state.showPreviewGrid);
  const staticPreviewPosition = useMemo(() => {
    const timedItemStarts = lyricTexts
      .filter((item) => isItemRenderEnabled(item) && item.end > item.start)
      .map((item) => item.start);

    if (timedItemStarts.length === 0) {
      return 0;
    }

    return Math.min(...timedItemStarts) + 16;
  }, [lyricTexts]);
  const position = disableAnimation ? staticPreviewPosition : livePosition;
  const activeCamera = useMemo(
    () => getCurrentCamera(lyricTexts, position),
    [lyricTexts, position]
  );
  const cameraFocusCues = useMemo(
    () => getCameraFocusCues(lyricTexts),
    [lyricTexts]
  );
  const cameraFocusTargetsById = useMemo(
    () => getCameraFocusTargetsById(lyricTexts),
    [lyricTexts]
  );
  const activeCameraSettings = useMemo(
    () => normalizeCameraSettings(activeCamera?.cameraSettings),
    [activeCamera?.cameraSettings]
  );
  const cameraSettings = useMemo(() => {
    if (!activeCamera) {
      return activeCameraSettings;
    }

    return resolveCameraSettingsAtPosition(
      activeCameraSettings,
      cameraFocusCues,
      cameraFocusTargetsById,
      activeCamera.start,
      position
    );
  }, [
    activeCamera,
    activeCameraSettings,
    cameraFocusCues,
    cameraFocusTargetsById,
    position,
  ]);
  const cameraLensProfile = useMemo(
    () => getCameraLensProfile(cameraSettings.focalLength),
    [cameraSettings.focalLength]
  );
  const cameraScale = cameraLensProfile.sceneScale;
  const cameraBackgroundDollyScale = Math.max(
    1,
    getCameraDollyScale(cameraSettings.dollyPosition, 1)
  );
  const cameraBackgroundTruckOffset = getCameraTruckOffset(
    cameraSettings.truckPosition,
    1,
    previewWidth
  );
  const backgroundTruckCoverage =
    previewWidth > 0
      ? 1 + (Math.abs(cameraBackgroundTruckOffset) * 2) / previewWidth
      : 1;
  const cameraTiltOffset = getCameraTiltOffset(
    cameraSettings.tilt,
    previewHeight
  );
  const backgroundTiltCoverage =
    previewHeight > 0
      ? 1 + (Math.abs(cameraTiltOffset) * 2) / previewHeight
      : 1;
  const backgroundRotationCoverage = getRotationCoverageScale(
    cameraSettings.rotation,
    previewWidth,
    previewHeight
  );
  const cameraBackgroundScaleX =
    cameraLensProfile.backgroundScaleX *
    cameraBackgroundDollyScale *
    backgroundTruckCoverage *
    backgroundRotationCoverage;
  const cameraBackgroundScaleY =
    cameraLensProfile.backgroundScaleY *
    cameraBackgroundDollyScale *
    backgroundTiltCoverage *
    backgroundRotationCoverage;
  const visibleLyricTexts: LyricText[] = useMemo(
    () => getCurrentLyrics(lyricTexts, position),
    [lyricTexts, position]
  );
  const renderableTextItems = useMemo(
    () => lyricTexts.filter((item) => isTimelinePreviewTextItem(item)),
    [lyricTexts]
  );
  const activeNonTextItems = useMemo(
    () =>
      getActiveNonTextItems(lyricTexts, position).filter((item) => {
        const elementType = getElementType(item);
        return !elementType || !hiddenElementTypeSet.has(elementType);
      }),
    [hiddenElementTypeSet, lyricTexts, position]
  );
  const previewNonTextItems = useMemo(() => {
    if (!isEditMode || editingMode !== EditingMode.free) {
      return activeNonTextItems;
    }

    const mergedItems = [...activeNonTextItems];

    lyricTexts.forEach((item) => {
      if (
        selectedLyricTextIds.has(item.id) &&
        !isTextItem(item) &&
        isItemRenderEnabled(item) &&
        !hiddenElementTypeSet.has(getElementType(item) as ElementType) &&
        !mergedItems.some((existingItem) => existingItem.id === item.id)
      ) {
        mergedItems.push(item);
      }
    });

    return mergedItems.sort((left, right) => {
      if (left.textBoxTimelineLevel !== right.textBoxTimelineLevel) {
        return left.textBoxTimelineLevel - right.textBoxTimelineLevel;
      }

      if (left.start !== right.start) {
        return left.start - right.start;
      }

      return left.id - right.id;
    });
  }, [
    activeNonTextItems,
    editingMode,
    hiddenElementTypeSet,
    isEditMode,
    lyricTexts,
    selectedLyricTextIds,
  ]);
  const topActiveVisualizerId = useMemo(
    () =>
      [...previewNonTextItems]
        .reverse()
        .find((item) => getElementType(item) === "visualizer")?.id,
    [previewNonTextItems]
  );

  const [draggingTextDimensions, setDraggingTextDimensions] =
    useState<DraggingTextState>();
  const [draggingImageState, setDraggingImageState] =
    useState<DraggingImageState>();
  const [rotatingImageState, setRotatingImageState] =
    useState<RotatingImageState>();

  const setPreviewContainerRef = useEditorStore(
    (state) => state.setPreviewContainerRef
  );
  const previewRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && isEditMode) {
        setPreviewContainerRef(node);
      }
    },
    [isEditMode, setPreviewContainerRef]
  );

  const handleTextSelect = useCallback(
    (lyricText: LyricText) => {
      saveEditingText(editingText);
      setSelectedTimelineTextIds(new Set([lyricText.id]));
      toggleCustomizationPanelState(true);
      setCustomizationPanelTabId("text_settings");
    },
    [editingText, setCustomizationPanelTabId, setSelectedTimelineTextIds, toggleCustomizationPanelState]
  );

  const handleTextDragMove = useCallback(
    (
      evt: KonvaEventObject<DragEvent>,
      lyricText: LyricText,
      peerTextItems: LyricText[]
    ) => {
      if (!isEditMode) {
        return;
      }

      const width = evt.target.getSize().width;
      const height = evt.target.getSize().height;
      const currentPosition = evt.target.getPosition();
      const resolvedAlignment = resolveTextDragAlignment({
        dragBounds: {
          width,
          height,
          x: currentPosition.x,
          y: currentPosition.y,
        },
        previewWidth,
        previewHeight,
        peerTextItems,
      });

      evt.target.position({
        x: resolvedAlignment.x,
        y: resolvedAlignment.y,
      });

      setDraggingTextDimensions({
        width,
        height,
        x: resolvedAlignment.x,
        y: resolvedAlignment.y,
        guides: resolvedAlignment.guides,
      });
    },
    [isEditMode, previewHeight, previewWidth]
  );

  const visibleLyricTextsComponents = useMemo(
    () =>
      editingMode === EditingMode.free ? (
        <>
          {visibleLyricTexts
            .filter((lt) => !lt.isImage)
            .map((lyricText) => {
              const textCenterX =
                lyricText.textX * previewWidth +
                (lyricText.width ?? 0) * previewWidth * 0.5;
              const textCenterY =
                lyricText.textY * previewHeight +
                (lyricText.height ?? 0) * 0.5;
              const normalizedTextX =
                (textCenterX - previewWidth / 2) / (previewWidth / 2);
              const normalizedTextY =
                (textCenterY - previewHeight / 2) / (previewHeight / 2);
              const radialLensScale = getRadialLensScale(
                cameraLensProfile,
                normalizedTextX,
                normalizedTextY
              );
              const zPosition =
                lyricText.cameraZPosition ?? lyricText.cameraDepth;
              const zPositionScale = activeCamera
                ? getCameraZPositionScale(zPosition)
                : 1;
              const dollyScale = activeCamera
                ? getCameraDollyScale(cameraSettings.dollyPosition, zPosition)
                : 1;
              const truckOffset = activeCamera
                ? getCameraTruckOffset(
                    cameraSettings.truckPosition,
                    zPosition,
                    previewWidth
                  )
                : 0;
              const textCameraScale =
                cameraScale * radialLensScale * zPositionScale * dollyScale;
              return (
                <Group
                  key={lyricText.id}
                  x={previewWidth / 2 + truckOffset}
                  y={previewHeight / 2 + cameraTiltOffset}
                  offsetX={previewWidth / 2}
                  offsetY={previewHeight / 2}
                  scaleX={textCameraScale}
                  scaleY={textCameraScale}
                  rotation={cameraSettings.rotation}
                  skewX={
                    -normalizedTextX * cameraLensProfile.wideAmount * 0.025
                  }
                >
                {(() => {
                  const glitchPrimaryTextOffset = getGlitchPrimaryTextOffset(
                    lyricText,
                    position,
                    previewWidth
                  );
                const floatingTextOffset = getFloatingTextOffset(
                  lyricText,
                  position,
                  previewWidth,
                  previewHeight
                );
                const ashFadeOpacity = getAshFadeTextOpacity(lyricText, position);
                const glitchPrimaryTextOpacity = getGlitchPrimaryTextOpacity(
                  lyricText,
                  position,
                  previewWidth
                );
                const itemOpacity = lyricText.itemOpacity ?? 1;
                const effectBlurRenderProps = getTextBlurRenderProps(
                  lyricText,
                  position,
                  previewWidth
                );
                const focusBlurRadius = activeCamera
                  ? getCameraFocusBlurRadius(
                      cameraSettings,
                      zPosition,
                      previewWidth
                    ) / Math.max(0.1, textCameraScale)
                  : 0;
                const combinedBlurRadius = Math.max(
                  Number(effectBlurRenderProps.blurRadius ?? 0),
                  focusBlurRadius
                );
                const blurRenderProps =
                  combinedBlurRadius > 0.2
                    ? {
                        blurRadius: combinedBlurRadius,
                      }
                    : {};
                const directionalFadeRenderProps =
                  getDirectionalFadeTextRenderProps(
                    lyricText,
                    position,
                    previewWidth
                  );
                const {
                  isFullyFaded: isDirectionalFadeFullyFaded = false,
                  opacityMultiplier: directionalFadeOpacityMultiplier = 1,
                  ...directionalFadeTextProps
                } = directionalFadeRenderProps;
                const waterDistortionRenderProps = getWaterDistortionRenderProps(
                  lyricText,
                  position,
                  previewWidth,
                  previewHeight
                );
                const hasDirectionalFade = getDirectionalFadeEffectsFromLyricText(
                  lyricText
                ).some((effect) => effect.enabled);

                return (
                  <>
              <GlitchPreview
                lyricText={lyricText}
                x={lyricText.textX * previewWidth + floatingTextOffset.xOffset}
                y={lyricText.textY * previewHeight + floatingTextOffset.yOffset}
                previewWidth={previewWidth}
                position={position}
              />
              <LyricsTextView
                isEditMode={isEditMode}
                disableGlow={hasDirectionalFade}
                previewWindowWidth={previewWidth}
                previewWindowHeight={previewHeight}
                x={
                  lyricText.textX * previewWidth +
                  floatingTextOffset.xOffset +
                  glitchPrimaryTextOffset.xOffset +
                  (waterDistortionRenderProps.xOffset ?? 0)
                }
                y={
                  lyricText.textY * previewHeight +
                  floatingTextOffset.yOffset +
                  glitchPrimaryTextOffset.yOffset +
                  (waterDistortionRenderProps.yOffset ?? 0)
                }
                lyricText={lyricText}
                width={
                  lyricText.width
                    ? Math.min(previewWidth, lyricText.width * previewWidth)
                    : undefined
                }
                height={lyricText.height}
                onResize={(newWidth: number, newHeight: number) => {
                  const updateLyricTexts = lyricTexts.map(
                    (curLoopLyricText: LyricText, updatedIndex: number) => {
                      if (curLoopLyricText.id === lyricText.id) {
                        return {
                          ...curLoopLyricText,
                          width: newWidth / previewWidth,
                          height: newHeight,
                        };
                      }

                      return curLoopLyricText;
                    }
                  );

                  setLyricTexts(updateLyricTexts, false);
                }}
                onDragStart={(evt: KonvaEventObject<DragEvent>) => {}}
                onDragEnd={(evt: KonvaEventObject<DragEvent>) => {
                  if (isEditMode) {
                    handleDragEnd(evt, lyricText);
                  }
                }}
                onDragMove={(evt: KonvaEventObject<DragEvent>) => {
                  handleTextDragMove(
                    evt,
                    lyricText,
                    (showAllTextPreviewOverlay ? renderableTextItems : visibleLyricTexts).filter(
                      (item) => item.id !== lyricText.id
                    )
                  );
                }}
                onEscapeKeysPressed={(lyricText: LyricText) => {
                  saveEditingText(lyricText);
                }}
                {...getAshFadeTextRenderProps(lyricText, position, previewWidth)}
                {...directionalFadeTextProps}
                {...blurRenderProps}
                skewX={waterDistortionRenderProps.skewX}
                skewY={waterDistortionRenderProps.skewY}
                scaleX={waterDistortionRenderProps.scaleX}
                scaleY={waterDistortionRenderProps.scaleY}
                visible={!isDirectionalFadeFullyFaded}
                opacity={
                  itemOpacity *
                  ashFadeOpacity *
                  glitchPrimaryTextOpacity *
                  directionalFadeOpacityMultiplier
                }
              />
              <AshFadePreview
                lyricText={lyricText}
                x={lyricText.textX * previewWidth + floatingTextOffset.xOffset}
                y={lyricText.textY * previewHeight + floatingTextOffset.yOffset}
                previewWidth={previewWidth}
                position={position}
              />
                  </>
                );
                })()}
                </Group>
              );
            })}
        </>
      ) : null,
    [
      editingMode,
      cameraLensProfile,
      cameraScale,
      activeCamera,
      cameraSettings.focusDistance,
      cameraSettings.dollyPosition,
      cameraSettings.rotation,
      cameraSettings.tilt,
      cameraSettings.truckPosition,
      isEditMode,
      lyricTexts,
      position,
      previewHeight,
      previewWidth,
      renderableTextItems,
      selectedLyricTextIds,
      showAllTextPreviewOverlay,
      visibleLyricTexts,
      handleTextDragMove,
    ]
  );

  const handleImageSelect = useCallback(
    (imageItem: LyricText) => {
      saveEditingText(editingText);
      setSelectedTimelineTextIds(new Set([imageItem.id]));
      toggleCustomizationPanelState(true);
      setCustomizationPanelTabId("image_settings");
    },
    [
      editingText,
      lyricTexts,
      setCustomizationPanelTabId,
      setSelectedTimelineTextIds,
      toggleCustomizationPanelState,
    ]
  );

  const handleImageDragEnd = useCallback(
    (imageItem: LyricText, nextTextX: number, nextTextY: number) => {
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (curLoopLyricText.id === imageItem.id) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        return curLoopLyricText;
      });

      setLyricTexts(updateLyricTexts, false);
    },
    [lyricTexts, setLyricTexts]
  );

  const handleImageRotateEnd = useCallback(
    (imageItem: LyricText, nextRotation: number) => {
      const updateLyricTexts = lyricTexts.map((curLoopLyricText: LyricText) => {
        if (curLoopLyricText.id === imageItem.id) {
          return {
            ...curLoopLyricText,
            imageRotation: nextRotation,
          };
        }

        return curLoopLyricText;
      });

      setLyricTexts(updateLyricTexts, false);
    },
    [lyricTexts, setLyricTexts]
  );

  const renderNonTextLayer = useCallback(
    (item: LyricText) => {
      const isSelectedImage = isImageItem(item) && selectedLyricTextIds.has(item.id);

      if (isImageItem(item) && item.imageUrl) {
        return (
          <ImagePreviewLayer
            key={item.id}
            item={item}
            previewWidth={previewWidth}
            previewHeight={previewHeight}
            position={position}
            overrideTextX={
              draggingImageState?.id === item.id ? draggingImageState.currentTextX : undefined
            }
            overrideTextY={
              draggingImageState?.id === item.id ? draggingImageState.currentTextY : undefined
            }
            overrideRotation={
              rotatingImageState?.id === item.id ? rotatingImageState.currentRotation : undefined
            }
          />
        );
      }

      const elementType = getElementType(item);

      if (elementType === "visualizer") {
        return (
          <VisualizerPreviewSurface
            key={item.id}
            width={previewWidth}
            height={previewHeight}
            position={position}
            lyricText={item}
            opacity={item.itemOpacity ?? 1}
            previewMode={editingMode === EditingMode.free ? "free" : "static"}
            showPreviewEffects={item.id === topActiveVisualizerId}
            disableAnimation={false}
          />
        );
      }

      if (elementType === "particle") {
        return (
          <View
            key={item.id}
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
            UNSAFE_style={{ pointerEvents: "none", opacity: item.itemOpacity ?? 1 }}
            data-export-non-text-layer="particle"
          >
            <Stage width={previewWidth} height={previewHeight}>
              <Particles
                width={previewWidth}
                height={previewHeight}
                position={position}
                lyricText={item}
                disableAnimation={disableAnimation}
              />
            </Stage>
          </View>
        );
      }

      if (elementType === "light") {
        return (
          <LightPreviewSurface
            key={item.id}
            width={previewWidth}
            height={previewHeight}
            lyricText={item}
            position={position}
            opacity={item.itemOpacity ?? 1}
            disableAnimation={disableAnimation}
          />
        );
      }

      if (elementType === "grain") {
        return (
          <GrainPreviewSurface
            key={item.id}
            width={previewWidth}
            height={previewHeight}
            lyricText={item}
            opacity={item.itemOpacity ?? 1}
            disableAnimation={disableAnimation}
          />
        );
      }

      return null;
    },
    [
      draggingImageState,
      disableAnimation,
      editingMode,
      position,
      previewHeight,
      previewWidth,
      rotatingImageState,
      selectedLyricTextIds,
      topActiveVisualizerId,
    ]
  );

  const activeNonTextLayers = useMemo(
    () => previewNonTextItems.map((item) => renderNonTextLayer(item)),
    [previewNonTextItems, renderNonTextLayer]
  );

  function saveEditingText(editingText: LyricText | undefined) {
    if (editingText) {
      const updateLyricTexts = lyricTexts.map(
        (curLoopLyricText: LyricText, updatedIndex: number) => {
          if (curLoopLyricText.id === editingText.id) {
            return {
              ...editingText,
            };
          }

          return curLoopLyricText;
        }
      );

      setLyricTexts(updateLyricTexts, false);
    }
    clearEditingText();
  }

  function handleDragEnd(
    evt: KonvaEventObject<DragEvent>,
    lyricText: LyricText
  ) {
    const localPosition = evt.target.getPosition();
    const localX = localPosition.x;
    const localY = localPosition.y;
    const nextTextX = localX / previewWidth;
    const nextTextY = localY / previewHeight;
    const isGroupDrag =
      selectedLyricTextIds.size > 1 && selectedLyricTextIds.has(lyricText.id);

    const updateLyricTexts = lyricTexts.map(
      (curLoopLyricText: LyricText, updatedIndex: number) => {
        if (
          isGroupDrag &&
          selectedLyricTextIds.has(curLoopLyricText.id) &&
          isTextItem(curLoopLyricText)
        ) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        if (curLoopLyricText.id === lyricText.id) {
          return {
            ...curLoopLyricText,
            textX: nextTextX,
            textY: nextTextY,
          };
        }

        return curLoopLyricText;
      }
    );

    setLyricTexts(updateLyricTexts, false);
    setDraggingTextDimensions(undefined);
  }

  function handleOutsideClick() {
    saveEditingText(editingText);
    setSelectedTimelineTextIds(new Set([]));
  }

  if (editingMode === EditingMode.free) {
    return (
      <View width={maxWidth} height={maxHeight}>
        <Flex
          justifyContent={"center"}
          alignItems={"center"}
          width={"100%"}
          height={"100%"}
        >
          <div ref={previewRef} data-export-mode="free">
          <View
            backgroundColor={"gray-50"}
            position={"relative"}
            width={previewWidth}
            height={previewHeight}
            UNSAFE_style={{ overflow: "hidden" }}
          >
            <View
              position={"absolute"}
              width={previewWidth}
              height={previewHeight}
              data-export-non-text-stack="true"
              data-export-camera-scale-x={cameraBackgroundScaleX}
              data-export-camera-scale-y={cameraBackgroundScaleY}
              data-export-camera-rotation={cameraSettings.rotation}
              data-export-camera-translate-x={cameraBackgroundTruckOffset}
              data-export-camera-translate-y={cameraTiltOffset}
              UNSAFE_style={{
                transform: `translate(${cameraBackgroundTruckOffset}px, ${cameraTiltOffset}px) rotate(${cameraSettings.rotation}deg) scale(${cameraBackgroundScaleX}, ${cameraBackgroundScaleY})`,
                transformOrigin: "center center",
                willChange:
                  cameraBackgroundScaleX !== 1 ||
                  cameraBackgroundScaleY !== 1 ||
                  cameraBackgroundTruckOffset !== 0 ||
                  cameraTiltOffset !== 0 ||
                  cameraSettings.rotation !== 0
                    ? "transform"
                    : undefined,
              }}
            >
              {activeNonTextLayers}
            </View>
            <View
              position={"absolute"}
              width={previewWidth}
              height={previewHeight}
              data-export-text-stage="true"
            >
              <Stage width={previewWidth} height={previewHeight}>
                <Layer>
                  <Rect
                    width={previewWidth}
                    height={previewHeight}
                    onClick={handleOutsideClick}
                  ></Rect>
                </Layer>
                <ImageSelectionOverlay
                  imageItems={previewNonTextItems.filter(
                    (item) => isImageItem(item) && item.imageUrl
                  )}
                  selectedLyricTextIds={selectedLyricTextIds}
                  previewWidth={previewWidth}
                  previewHeight={previewHeight}
                  position={position}
                  editingMode={editingMode}
                  isEditMode={isEditMode}
                  draggingImageState={draggingImageState}
                  setDraggingImageState={setDraggingImageState}
                  rotatingImageState={rotatingImageState}
                  setRotatingImageState={setRotatingImageState}
                  onImageSelect={handleImageSelect}
                  onImageDragCommit={handleImageDragEnd}
                  onImageRotateCommit={handleImageRotateEnd}
                />
                {isEditMode && showPreviewGrid ? (
                  <PreviewGridOverlay
                    previewWidth={previewWidth}
                    previewHeight={previewHeight}
                  />
                ) : null}
                {isEditMode && showAllTextPreviewOverlay ? (
                  <AllTextPreviewOverlay
                    lyricTexts={renderableTextItems.filter(
                      (item) => !visibleLyricTexts.some((visibleItem) => visibleItem.id === item.id)
                    )}
                    previewWidth={previewWidth}
                    previewHeight={previewHeight}
                    selectedLyricTextIds={selectedLyricTextIds}
                    onSelectLyricText={handleTextSelect}
                    onDragMoveLyricText={(evt, lyricText) => {
                      handleTextDragMove(
                        evt,
                        lyricText,
                        renderableTextItems.filter((item) => item.id !== lyricText.id)
                      );
                    }}
                    onDragEndLyricText={(evt, lyricText) => {
                      handleDragEnd(evt, lyricText);
                    }}
                  />
                ) : null}
                <Layer listening={isEditMode}>
                  {visibleLyricTextsComponents}
                </Layer>
                {draggingTextDimensions ? (
                  <PreviewWindowAlignGuide
                    previewWidth={previewWidth}
                    previewHeight={previewHeight}
                    guides={draggingTextDimensions.guides}
                  />
                ) : (
                  <></>
                )}
              </Stage>
            </View>
          </View>
          </div>
        </Flex>
      </View>
    );
  }

  return (
    <View width={maxWidth} height={maxHeight}>
      <Flex
        justifyContent={"center"}
        alignItems={"center"}
        width={"100%"}
        height={"100%"}
      >
        <div ref={previewRef} data-export-mode="static">
        <View
          backgroundColor={"gray-50"}
          position={"relative"}
          width={previewWidth}
          height={previewHeight}
          UNSAFE_style={{ overflow: "hidden" }}
        >
          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
            data-export-non-text-stack="true"
            data-export-camera-scale-x={cameraBackgroundScaleX}
            data-export-camera-scale-y={cameraBackgroundScaleY}
            data-export-camera-rotation={cameraSettings.rotation}
            data-export-camera-translate-x={cameraBackgroundTruckOffset}
            data-export-camera-translate-y={cameraTiltOffset}
            UNSAFE_style={{
              transform: `translate(${cameraBackgroundTruckOffset}px, ${cameraTiltOffset}px) rotate(${cameraSettings.rotation}deg) scale(${cameraBackgroundScaleX}, ${cameraBackgroundScaleY})`,
              transformOrigin: "center center",
              willChange:
                cameraBackgroundScaleX !== 1 ||
                cameraBackgroundScaleY !== 1 ||
                cameraBackgroundTruckOffset !== 0 ||
                cameraTiltOffset !== 0 ||
                cameraSettings.rotation !== 0
                  ? "transform"
                  : undefined,
            }}
          >
            {activeNonTextLayers}
          </View>
          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
          >
            <Stage width={previewWidth} height={previewHeight}>
              <Layer>
                <Rect
                  width={previewWidth}
                  height={previewHeight}
                  onClick={handleOutsideClick}
                ></Rect>
              </Layer>
            </Stage>
          </View>

          <View
            position={"absolute"}
            width={previewWidth}
            height={previewHeight}
          >
            <TimeSyncedLyrics
              height={previewHeight}
              width={previewWidth}
              position={position}
              lyricTexts={lyricTexts}
            />
          </View>
        </View>
        </div>
      </Flex>
    </View>
  );
}

function usePreviewSize(
  maxWidth: number,
  maxHeight: number,
  resolution?: VideoAspectRatio
) {
  return useMemo(() => {
    return getPreviewSize(maxWidth, maxHeight, resolution);
  }, [maxWidth, maxHeight, resolution]);
}
