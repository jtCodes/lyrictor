import { Dispatch, SetStateAction, useMemo } from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { Circle, Group, Layer, Rect } from "react-konva";
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  onImageSelect,
  onImageDragCommit,
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
  onImageSelect: (imageItem: LyricText) => void;
  onImageDragCommit: (
    imageItem: LyricText,
    nextTextX: number,
    nextTextY: number
  ) => void;
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
            {[-8, 0, 8].flatMap((dotX) =>
              [-4, 4].map((dotY, index) => (
                <Circle
                  key={`${dotX}-${dotY}-${index}`}
                  x={dotX}
                  y={dotY}
                  radius={2.1}
                  fill="rgba(255,255,255,0.96)"
                />
              ))
            )}
          </Group>
        </Layer>
      ) : null}
    </>
  );
}