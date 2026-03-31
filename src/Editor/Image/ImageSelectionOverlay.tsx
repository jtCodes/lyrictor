import { Dispatch, SetStateAction, useMemo } from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { Circle, Group, Layer, Line, Rect } from "react-konva";
import { EditingMode } from "../../Project/types";
import { LyricText } from "../types";
import { getImagePreviewBounds } from "./imageMotion";

export interface DraggingImageState {
  id: number;
  startHandleX: number;
  startHandleY: number;
  startTextX: number;
  startTextY: number;
  currentTextX: number;
  currentTextY: number;
}

export interface RotatingImageState {
  id: number;
  currentRotation: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export default function ImageSelectionOverlay({
  imageItems,
  selectedLyricTextIds,
  previewWidth,
  previewHeight,
  position,
  editingMode,
  isEditMode,
  draggingImageState,
  setDraggingImageState,
  rotatingImageState,
  setRotatingImageState,
  onImageSelect,
  onImageDragCommit,
  onImageRotateCommit,
}: {
  imageItems: LyricText[];
  selectedLyricTextIds: Set<number>;
  previewWidth: number;
  previewHeight: number;
  position: number;
  editingMode: EditingMode;
  isEditMode: boolean;
  draggingImageState: DraggingImageState | undefined;
  setDraggingImageState: Dispatch<SetStateAction<DraggingImageState | undefined>>;
  rotatingImageState: RotatingImageState | undefined;
  setRotatingImageState: Dispatch<SetStateAction<RotatingImageState | undefined>>;
  onImageSelect: (imageItem: LyricText) => void;
  onImageDragCommit: (
    imageItem: LyricText,
    nextTextX: number,
    nextTextY: number
  ) => void;
  onImageRotateCommit: (imageItem: LyricText, nextRotation: number) => void;
}) {
  const imageSelectionHitTargets = useMemo(
    () =>
      editingMode === EditingMode.free && isEditMode
        ? imageItems.map((item) => ({
            item,
            bounds: getImagePreviewBounds(
              item,
              previewWidth,
              previewHeight,
              position,
              draggingImageState?.id === item.id
                ? draggingImageState.currentTextX
                : undefined,
              draggingImageState?.id === item.id
                ? draggingImageState.currentTextY
                : undefined
            ),
          }))
        : [],
    [
      draggingImageState,
      editingMode,
      imageItems,
      isEditMode,
      position,
      previewHeight,
      previewWidth,
    ]
  );

  const selectedImageItem = useMemo(
    () => imageItems.find((item) => selectedLyricTextIds.has(item.id)),
    [imageItems, selectedLyricTextIds]
  );

  const selectedImagePreviewBounds = useMemo(() => {
    if (!selectedImageItem || editingMode !== EditingMode.free || !isEditMode) {
      return undefined;
    }

    return getImagePreviewBounds(
      selectedImageItem,
      previewWidth,
      previewHeight,
      position,
      draggingImageState?.id === selectedImageItem.id
        ? draggingImageState.currentTextX
        : undefined,
      draggingImageState?.id === selectedImageItem.id
        ? draggingImageState.currentTextY
        : undefined
    );
  }, [
    draggingImageState,
    editingMode,
    isEditMode,
    position,
    previewHeight,
    previewWidth,
    selectedImageItem,
  ]);

  const selectedImageCenter = useMemo(() => {
    if (!selectedImagePreviewBounds) {
      return undefined;
    }

    return {
      x: selectedImagePreviewBounds.left + selectedImagePreviewBounds.width / 2,
      y: selectedImagePreviewBounds.top + selectedImagePreviewBounds.height / 2,
    };
  }, [selectedImagePreviewBounds]);

  const selectedImageRotation =
    rotatingImageState && rotatingImageState.id === selectedImageItem?.id
      ? rotatingImageState.currentRotation
      : selectedImageItem?.imageRotation ?? 0;

  const rotationHandlePosition = useMemo(() => {
    if (!selectedImagePreviewBounds || !selectedImageCenter) {
      return undefined;
    }

    const handleRadius = selectedImagePreviewBounds.height / 2 + 28;
    const radians = (selectedImageRotation * Math.PI) / 180;

    return {
      x: selectedImageCenter.x + Math.sin(radians) * handleRadius,
      y: selectedImageCenter.y - Math.cos(radians) * handleRadius,
      radius: handleRadius,
    };
  }, [selectedImageCenter, selectedImagePreviewBounds, selectedImageRotation]);

  if (!isEditMode || editingMode !== EditingMode.free) {
    return null;
  }

  return (
    <>
      {imageSelectionHitTargets.length > 0 ? (
        <Layer>
          {imageSelectionHitTargets.map(({ item, bounds }) => (
            <Rect
              key={`image-hit-${item.id}`}
              x={bounds.left}
              y={bounds.top}
              width={bounds.width}
              height={bounds.height}
              fill="rgba(0,0,0,0.001)"
              onClick={() => {
                onImageSelect(item);
              }}
            />
          ))}
        </Layer>
      ) : null}
      {selectedImageItem && selectedImagePreviewBounds ? (
        <Layer>
          {selectedImageCenter && rotationHandlePosition ? (
            <>
              <Line
                points={[
                  selectedImageCenter.x,
                  selectedImageCenter.y,
                  rotationHandlePosition.x,
                  rotationHandlePosition.y,
                ]}
                stroke="rgba(106, 171, 255, 0.72)"
                strokeWidth={1.5}
                dash={[4, 4]}
                listening={false}
              />
              <Group
                x={rotationHandlePosition.x}
                y={rotationHandlePosition.y}
                draggable={true}
                onDragStart={() => {
                  onImageSelect(selectedImageItem);
                  setRotatingImageState({
                    id: selectedImageItem.id,
                    currentRotation: selectedImageItem.imageRotation ?? 0,
                  });
                }}
                onDragMove={(evt: KonvaEventObject<DragEvent>) => {
                  if (!selectedImageCenter) {
                    return;
                  }

                  const nextRotation = normalizeDegrees(
                    (Math.atan2(
                      evt.target.y() - selectedImageCenter.y,
                      evt.target.x() - selectedImageCenter.x
                    ) *
                      180) /
                      Math.PI +
                      90
                  );

                  setRotatingImageState({
                    id: selectedImageItem.id,
                    currentRotation: nextRotation,
                  });
                }}
                onDragEnd={() => {
                  setRotatingImageState((currentState) => {
                    if (!currentState || currentState.id !== selectedImageItem.id) {
                      return undefined;
                    }

                    onImageRotateCommit(selectedImageItem, currentState.currentRotation);
                    return undefined;
                  });
                }}
              >
                <Circle
                  radius={10}
                  fill="rgba(15, 24, 39, 0.96)"
                  stroke="rgba(106, 171, 255, 0.98)"
                  strokeWidth={1.75}
                  shadowColor="rgba(0,0,0,0.34)"
                  shadowBlur={14}
                  shadowOffsetY={6}
                  shadowOpacity={0.85}
                />
                <Line
                  points={[-3, -1, 0, -4, 3, -1]}
                  stroke="rgba(255,255,255,0.98)"
                  strokeWidth={1.5}
                  lineCap="round"
                  lineJoin="round"
                />
                <Line
                  points={[-4, 1, 0, 5, 4, 1]}
                  stroke="rgba(255,255,255,0.98)"
                  strokeWidth={1.5}
                  lineCap="round"
                  lineJoin="round"
                />
              </Group>
            </>
          ) : null}
          <Group
            x={selectedImagePreviewBounds.left + selectedImagePreviewBounds.width / 2}
            y={Math.max(18, selectedImagePreviewBounds.top - 24)}
            draggable={true}
            onDragStart={(evt: KonvaEventObject<DragEvent>) => {
              onImageSelect(selectedImageItem);
              setDraggingImageState({
                id: selectedImageItem.id,
                startHandleX: evt.target.x(),
                startHandleY: evt.target.y(),
                startTextX: selectedImageItem.textX ?? 0.5,
                startTextY: selectedImageItem.textY ?? 0.5,
                currentTextX: selectedImageItem.textX ?? 0.5,
                currentTextY: selectedImageItem.textY ?? 0.5,
              });
            }}
            onDragMove={(evt: KonvaEventObject<DragEvent>) => {
              setDraggingImageState((currentState) => {
                if (!currentState || currentState.id !== selectedImageItem.id) {
                  return currentState;
                }

                const deltaX = evt.target.x() - currentState.startHandleX;
                const deltaY = evt.target.y() - currentState.startHandleY;

                return {
                  ...currentState,
                  currentTextX: clamp(
                    currentState.startTextX + deltaX / previewWidth,
                    0,
                    1
                  ),
                  currentTextY: clamp(
                    currentState.startTextY + deltaY / previewHeight,
                    0,
                    1
                  ),
                };
              });
            }}
            onDragEnd={() => {
              setDraggingImageState((currentState) => {
                if (!currentState || currentState.id !== selectedImageItem.id) {
                  return undefined;
                }

                onImageDragCommit(
                  selectedImageItem,
                  currentState.currentTextX,
                  currentState.currentTextY
                );

                return undefined;
              });
            }}
          >
            <Rect
              x={-18}
              y={-18}
              width={36}
              height={36}
              cornerRadius={9}
              fill="rgba(15, 24, 39, 0.92)"
              stroke="rgba(106, 171, 255, 0.98)"
              strokeWidth={1.5}
              shadowColor="rgba(0,0,0,0.34)"
              shadowBlur={14}
              shadowOffsetY={6}
              shadowOpacity={0.85}
            />
            <Line
              points={[-8, 0, 8, 0]}
              stroke="rgba(255,255,255,0.96)"
              strokeWidth={1.8}
              lineCap="round"
            />
            <Line
              points={[0, -8, 0, 8]}
              stroke="rgba(255,255,255,0.96)"
              strokeWidth={1.8}
              lineCap="round"
            />
            <Line
              points={[-8, 0, -4, -3, -4, 3]}
              fill="rgba(255,255,255,0.96)"
              closed={true}
            />
            <Line
              points={[8, 0, 4, -3, 4, 3]}
              fill="rgba(255,255,255,0.96)"
              closed={true}
            />
            <Line
              points={[0, -8, -3, -4, 3, -4]}
              fill="rgba(255,255,255,0.96)"
              closed={true}
            />
            <Line
              points={[0, 8, -3, 4, 3, 4]}
              fill="rgba(255,255,255,0.96)"
              closed={true}
            />
          </Group>
        </Layer>
      ) : null}
    </>
  );
}