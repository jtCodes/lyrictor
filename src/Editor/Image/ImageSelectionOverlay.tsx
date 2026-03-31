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

function startImageDrag(
  event: KonvaEventObject<DragEvent>,
  imageItem: LyricText,
  onImageSelect: (imageItem: LyricText) => void,
  setDraggingImageState: Dispatch<SetStateAction<DraggingImageState | undefined>>
) {
  onImageSelect(imageItem);
  setDraggingImageState({
    id: imageItem.id,
    startHandleX: event.target.x(),
    startHandleY: event.target.y(),
    startTextX: imageItem.textX ?? 0.5,
    startTextY: imageItem.textY ?? 0.5,
    currentTextX: imageItem.textX ?? 0.5,
    currentTextY: imageItem.textY ?? 0.5,
  });
}

function updateImageDrag(
  event: KonvaEventObject<DragEvent>,
  imageItem: LyricText,
  previewWidth: number,
  previewHeight: number,
  setDraggingImageState: Dispatch<SetStateAction<DraggingImageState | undefined>>
) {
  setDraggingImageState((currentState) => {
    if (!currentState || currentState.id !== imageItem.id) {
      return currentState;
    }

    const deltaX = event.target.x() - currentState.startHandleX;
    const deltaY = event.target.y() - currentState.startHandleY;

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
}

function endImageDrag(
  imageItem: LyricText,
  setDraggingImageState: Dispatch<SetStateAction<DraggingImageState | undefined>>,
  onImageDragCommit: (imageItem: LyricText, nextTextX: number, nextTextY: number) => void
) {
  setDraggingImageState((currentState) => {
    if (!currentState || currentState.id !== imageItem.id) {
      return undefined;
    }

    onImageDragCommit(
      imageItem,
      currentState.currentTextX,
      currentState.currentTextY
    );

    return undefined;
  });
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

    return {
      x: selectedImageCenter.x,
      y: Math.max(22, selectedImagePreviewBounds.top - 34),
    };
  }, [selectedImageCenter, selectedImagePreviewBounds]);

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
          <Group
            x={selectedImagePreviewBounds.left}
            y={selectedImagePreviewBounds.top}
            draggable={true}
            onDragStart={(evt: KonvaEventObject<DragEvent>) => {
              startImageDrag(
                evt,
                selectedImageItem,
                onImageSelect,
                setDraggingImageState
              );
            }}
            onDragMove={(evt: KonvaEventObject<DragEvent>) => {
              updateImageDrag(
                evt,
                selectedImageItem,
                previewWidth,
                previewHeight,
                setDraggingImageState
              );
            }}
            onDragEnd={() => {
              endImageDrag(
                selectedImageItem,
                setDraggingImageState,
                onImageDragCommit
              );
            }}
          >
            <Rect
              width={selectedImagePreviewBounds.width}
              height={selectedImagePreviewBounds.height}
              stroke="rgba(106, 171, 255, 0.98)"
              strokeWidth={1.5}
              shadowColor="rgba(7,18,36,0.28)"
              shadowBlur={4}
              listening={true}
            />
            {[
              { x: 0, y: 0 },
              { x: selectedImagePreviewBounds.width, y: 0 },
              { x: 0, y: selectedImagePreviewBounds.height },
              {
                x: selectedImagePreviewBounds.width,
                y: selectedImagePreviewBounds.height,
              },
            ].map((corner, index) => (
              <Rect
                key={`corner-${index}`}
                x={corner.x - 5}
                y={corner.y - 5}
                width={10}
                height={10}
                cornerRadius={2}
                fill="rgba(106, 171, 255, 1)"
                stroke="rgba(10, 18, 30, 0.55)"
                strokeWidth={1}
                listening={false}
              />
            ))}
          </Group>
          {selectedImageCenter && rotationHandlePosition ? (
            <>
              <Line
                points={[
                  selectedImageCenter.x,
                  selectedImagePreviewBounds.top,
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
                  radius={12}
                  fill="rgba(15, 24, 39, 0.96)"
                  stroke="rgba(106, 171, 255, 0.98)"
                  strokeWidth={1.75}
                  shadowColor="rgba(0,0,0,0.34)"
                  shadowBlur={16}
                  shadowOffsetY={7}
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
        </Layer>
      ) : null}
    </>
  );
}