import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Heading,
  Text,
  TextField,
  View,
} from "@adobe/react-spectrum";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../../../Project/store";
import { LyricText } from "../../types";

interface TimelineListViewDialogProps {
  duration: number;
  onClose: () => void;
}

interface DraftTimelineItem {
  item: LyricText;
  textValue: string;
  startText: string;
  endText: string;
}

interface DraftValidationResult {
  start?: number;
  end?: number;
  error?: string;
}

interface SortableDraftTimelineItem extends DraftTimelineItem {
  parsedStart: number;
  parsedEnd: number;
}

function compareTimelineItems(a: LyricText, b: LyricText) {
  if (a.start !== b.start) {
    return a.start - b.start;
  }

  if (a.end !== b.end) {
    return a.end - b.end;
  }

  return a.id - b.id;
}

function formatTimeInput(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0.000";
  }

  return seconds.toFixed(3);
}

function parseTimeInput(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const isNegative = trimmedValue.startsWith("-");
  const normalizedValue = isNegative ? trimmedValue.slice(1).trim() : trimmedValue;

  if (normalizedValue.includes(":")) {
    const parts = normalizedValue.split(":").map((part) => part.trim());
    if (parts.some((part) => part.length === 0)) {
      return undefined;
    }

    let totalSeconds = 0;
    for (const part of parts) {
      const parsedPart = Number(part);
      if (!Number.isFinite(parsedPart) || parsedPart < 0) {
        return undefined;
      }

      totalSeconds = totalSeconds * 60 + parsedPart;
    }

    return isNegative ? -totalSeconds : totalSeconds;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}

function getItemTypeLabel(item: LyricText) {
  if (item.isVisualizer) {
    return "Visualizer";
  }

  if (item.isImage) {
    return "Image";
  }

  return "Lyric";
}

function getItemTitle(item: LyricText) {
  const trimmedText = item.text.trim();
  if (trimmedText.length > 0) {
    return trimmedText;
  }

  if (item.isVisualizer) {
    return "Visualizer block";
  }

  if (item.isImage) {
    return item.imageUrl ? "Imported image" : "Image block";
  }

  return "Empty lyric";
}

function getItemTypeAppearance(item: LyricText) {
  if (item.isVisualizer) {
    return {
      label: "Visualizer",
      chipBackground: "rgba(0, 140, 135, 0.14)",
      chipBorder: "rgba(0, 140, 135, 0.32)",
      chipColor: "#008c87",
      titleColor: "rgba(177, 238, 236, 0.95)",
    };
  }

  if (item.isImage) {
    return {
      label: "Image",
      chipBackground: "rgba(204, 164, 253, 0.14)",
      chipBorder: "rgba(204, 164, 253, 0.32)",
      chipColor: "rgb(204, 164, 253)",
      titleColor: "rgba(240, 229, 255, 0.95)",
    };
  }

  return {
    label: "Lyric",
    chipBackground: "rgba(104, 109, 244, 0.14)",
    chipBorder: "rgba(104, 109, 244, 0.32)",
    chipColor: "rgb(104, 109, 244)",
    titleColor: "rgba(226, 227, 255, 0.95)",
  };
}

function validateDraftItem(
  draftItem: DraftTimelineItem,
  duration: number
): DraftValidationResult {
  const start = parseTimeInput(draftItem.startText);
  const end = parseTimeInput(draftItem.endText);

  if (start === undefined) {
    return { error: "Enter a valid start time." };
  }

  if (end === undefined) {
    return { start, error: "Enter a valid end time." };
  }

  if (end <= start) {
    return { start, end, error: "End time must be greater than start time." };
  }

  return { start, end };
}

function compareDraftTimelineItems(
  a: SortableDraftTimelineItem,
  b: SortableDraftTimelineItem
) {
  if (a.parsedStart !== b.parsedStart) {
    return a.parsedStart - b.parsedStart;
  }

  if (a.parsedEnd !== b.parsedEnd) {
    return a.parsedEnd - b.parsedEnd;
  }

  return compareTimelineItems(a.item, b.item);
}

export default function TimelineListViewDialog({
  duration,
  onClose,
}: TimelineListViewDialogProps) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const updateLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const movedRowResetTimeoutRef = useRef<number | undefined>(undefined);

  const [draftItems, setDraftItems] = useState<DraftTimelineItem[]>(() =>
    [...lyricTexts].sort(compareTimelineItems).map((item) => ({
      item,
      textValue: item.text,
      startText: formatTimeInput(item.start),
      endText: formatTimeInput(item.end),
    }))
  );
  const [movedRowIds, setMovedRowIds] = useState<Set<number>>(new Set());
  const [textEditorItemId, setTextEditorItemId] = useState<number | undefined>();

  const validations = useMemo(
    () => draftItems.map((draftItem) => validateDraftItem(draftItem, duration)),
    [draftItems, duration]
  );

  const invalidRowCount = validations.filter(
    (validation) => validation.error !== undefined
  ).length;

  useEffect(() => {
    return () => {
      if (movedRowResetTimeoutRef.current !== undefined) {
        window.clearTimeout(movedRowResetTimeoutRef.current);
      }
    };
  }, []);

  function updateDraftItem(
    itemId: number,
    key: "textValue" | "startText" | "endText",
    value: string
  ) {
    setDraftItems((currentDraftItems) =>
      currentDraftItems.map((draftItem) => {
        if (draftItem.item.id !== itemId) {
          return draftItem;
        }

        return {
          ...draftItem,
          [key]: value,
        };
      })
    );
  }

  function handleDeleteItem(itemId: number) {
    setDraftItems((currentDraftItems) =>
      currentDraftItems.filter((draftItem) => draftItem.item.id !== itemId)
    );

    setTextEditorItemId((currentItemId) =>
      currentItemId === itemId ? undefined : currentItemId
    );
  }

  function handleRefreshOrder() {
    if (invalidRowCount > 0) {
      return;
    }

    setDraftItems((currentDraftItems) => {
      const previousOrder = currentDraftItems.map((draftItem) => draftItem.item.id);

      const refreshedDraftItems = currentDraftItems
        .map((draftItem, index) => {
          const validation = validations[index];
          return {
            ...draftItem,
            parsedStart: validation.start ?? draftItem.item.start,
            parsedEnd: validation.end ?? draftItem.item.end,
          };
        })
        .sort(compareDraftTimelineItems)
        .map(({ parsedStart, parsedEnd, ...draftItem }) => draftItem);

      const nextOrder = refreshedDraftItems.map((draftItem) => draftItem.item.id);
      const nextMovedRowIds = new Set<number>();

      nextOrder.forEach((itemId, index) => {
        if (previousOrder[index] !== itemId) {
          nextMovedRowIds.add(itemId);
        }
      });

      setMovedRowIds(nextMovedRowIds);

      if (movedRowResetTimeoutRef.current !== undefined) {
        window.clearTimeout(movedRowResetTimeoutRef.current);
      }

      movedRowResetTimeoutRef.current = window.setTimeout(() => {
        setMovedRowIds(new Set());
      }, 1400);

      return refreshedDraftItems;
    });
  }

  function handleSave() {
    if (invalidRowCount > 0) {
      return;
    }

    const updatedLyricTexts = draftItems
      .map((draftItem, index) => {
        const validation = validations[index];
        return {
          ...draftItem.item,
          text: draftItem.textValue,
          start: validation.start ?? draftItem.item.start,
          end: validation.end ?? draftItem.item.end,
        };
      })
      .sort(compareTimelineItems);

    updateLyricTexts(updatedLyricTexts);
    onClose();
  }

  const textEditorDraftItem = draftItems.find(
    (draftItem) => draftItem.item.id === textEditorItemId
  );

  return (
    <>
      <Dialog>
        <Heading>Timeline List View</Heading>
        <Divider />
        <Content>
          <Flex direction="column" gap="size-200" height="100%">
            <Text>
              Edit precise times for timeline items. Use seconds like 12.345 or
              clock format like 1:02.500.
            </Text>
            <Flex direction="row" alignItems="center" justifyContent="space-between" gap="size-200" wrap>
              <Text>
                {draftItems.length} item{draftItems.length === 1 ? "" : "s"}
                {invalidRowCount > 0
                  ? `, ${invalidRowCount} row${invalidRowCount === 1 ? "" : "s"} need attention before saving.`
                  : ", ready to save."}
              </Text>
              <Button
                variant="secondary"
                isDisabled={invalidRowCount > 0 || draftItems.length < 2}
                onPress={handleRefreshOrder}
              >
                Refresh List Order
              </Button>
            </Flex>
            <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.58)" }}>
              List order stays fixed while editing. Use Refresh List Order to sort the draft by the updated times.
            </Text>

            <View
              flex="1"
              overflow="auto"
              UNSAFE_style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <Flex direction="column" gap={0}>
                {draftItems.map((draftItem, index) => {
                  const validation = validations[index];
                  const itemTypeLabel = getItemTypeLabel(draftItem.item);
                  const itemTypeAppearance = getItemTypeAppearance(draftItem.item);
                  const canEditText = !draftItem.item.isVisualizer && !draftItem.item.isImage;
                  const itemTitle = getItemTitle({
                    ...draftItem.item,
                    text: draftItem.textValue,
                  });
                  const isMoved = movedRowIds.has(draftItem.item.id);

                  return (
                    <motion.div
                      key={draftItem.item.id}
                      layout
                      transition={{
                        layout: {
                          duration: 0.35,
                          ease: [0.2, 0.9, 0.25, 1],
                        },
                      }}
                      animate={{
                        backgroundColor: isMoved
                          ? "rgba(38, 128, 235, 0.12)"
                          : "rgba(0, 0, 0, 0)",
                        boxShadow: isMoved
                          ? "inset 0 0 0 1px rgba(38, 128, 235, 0.22)"
                          : "inset 0 0 0 1px rgba(0, 0, 0, 0)",
                      }}
                      style={{ willChange: "transform" }}
                    >
                      <View
                        padding="size-200"
                        borderBottomWidth={
                          index === draftItems.length - 1 ? undefined : "thin"
                        }
                        borderColor="dark"
                      >
                        <Flex direction="column" gap="size-100">
                          <Flex
                            direction="row"
                            gap="size-200"
                            alignItems="end"
                            justifyContent="space-between"
                            wrap
                          >
                            <Flex flex minWidth="size-3000" alignItems="center" gap="size-100">
                                {canEditText ? (
                                  <ActionButton
                                    aria-label="Open text settings"
                                    onPress={() => setTextEditorItemId(draftItem.item.id)}
                                    UNSAFE_style={{ minWidth: 32 }}
                                  >
                                    T
                                  </ActionButton>
                                ) : (
                                  <View width="size-400" />
                                )}
                              <View>
                                  <Text UNSAFE_style={{ color: itemTypeAppearance.titleColor }}>
                                    {itemTitle}
                                  </Text>
                                  <View marginTop="size-50">
                                    <Flex direction="row" alignItems="center" gap="size-100" wrap>
                                      <View
                                        paddingX="size-100"
                                        paddingY="size-25"
                                        UNSAFE_style={{
                                          background: itemTypeAppearance.chipBackground,
                                          border: `1px solid ${itemTypeAppearance.chipBorder}`,
                                          borderRadius: 999,
                                        }}
                                      >
                                        <Text UNSAFE_style={{ color: itemTypeAppearance.chipColor }}>
                                          {itemTypeAppearance.label}
                                        </Text>
                                      </View>
                                      <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.55)" }}>
                                        Level {draftItem.item.textBoxTimelineLevel}
                                      </Text>
                                    </Flex>
                                </View>
                              </View>
                            </Flex>

                            <TextField
                              label="Start"
                              value={draftItem.startText}
                              width="size-2000"
                              validationState={validation.error ? "invalid" : undefined}
                              onChange={(value) => {
                                updateDraftItem(draftItem.item.id, "startText", value);
                              }}
                            />

                            <TextField
                              label="End"
                              value={draftItem.endText}
                              width="size-2000"
                              validationState={validation.error ? "invalid" : undefined}
                              onChange={(value) => {
                                updateDraftItem(draftItem.item.id, "endText", value);
                              }}
                            />

                            <Button
                              variant="negative"
                              onPress={() => handleDeleteItem(draftItem.item.id)}
                            >
                              Delete
                            </Button>
                          </Flex>

                          {validation.error ? (
                            <Text UNSAFE_style={{ color: "rgb(255, 133, 133)" }}>
                              {validation.error}
                            </Text>
                          ) : null}
                        </Flex>
                      </View>
                    </motion.div>
                  );
                })}
              </Flex>
            </View>
          </Flex>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="accent" isDisabled={invalidRowCount > 0} onPress={handleSave}>
            Save Times
          </Button>
        </ButtonGroup>
      </Dialog>

      <DialogContainer onDismiss={() => setTextEditorItemId(undefined)}>
        {textEditorDraftItem ? (
          <Dialog>
            <Heading>Text Settings</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-200">
                <Text>{getItemTypeLabel(textEditorDraftItem.item)}</Text>
                <TextField
                  label="Text"
                  width="100%"
                  value={textEditorDraftItem.textValue}
                  onChange={(value) => {
                    updateDraftItem(textEditorDraftItem.item.id, "textValue", value);
                  }}
                />
              </Flex>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setTextEditorItemId(undefined)}>
                Close
              </Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </>
  );
}