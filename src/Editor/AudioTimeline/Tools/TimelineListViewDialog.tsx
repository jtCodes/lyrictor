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
import formatDuration from "format-duration";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../../../Project/store";
import { normalizeLyricTextTimelineLevels } from "../utils";
import LyricReferenceView from "../../Lyrics/LyricReferenceView";
import { LyricText } from "../../types";
import PlayPauseButton from "../PlayBackControls";

interface TimelineListViewDialogProps {
  duration: number;
  position: number;
  seek: (time: number) => void;
  playing: boolean;
  togglePlayPause: () => void;
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

function createDraftItem(item: LyricText): DraftTimelineItem {
  return {
    item,
    textValue: item.text,
    startText: formatTimeInput(item.start),
    endText: formatTimeInput(item.end),
  };
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
      chipBackground: "rgba(0, 140, 135, 0.08)",
      chipBorder: "rgba(0, 140, 135, 0.18)",
      chipColor: "rgba(112, 214, 210, 0.78)",
      titleColor: "rgba(177, 238, 236, 0.95)",
    };
  }

  if (item.isImage) {
    return {
      label: "Image",
      chipBackground: "rgba(204, 164, 253, 0.08)",
      chipBorder: "rgba(204, 164, 253, 0.18)",
      chipColor: "rgba(224, 203, 255, 0.78)",
      titleColor: "rgba(240, 229, 255, 0.95)",
    };
  }

  return {
    label: "Lyric",
    chipBackground: "rgba(104, 109, 244, 0.08)",
    chipBorder: "rgba(104, 109, 244, 0.18)",
    chipColor: "rgba(191, 194, 255, 0.78)",
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
  position,
  seek,
  playing,
  togglePlayPause,
  onClose,
}: TimelineListViewDialogProps) {
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const updateLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const movedRowResetTimeoutRef = useRef<number | undefined>(undefined);
  const newRowResetTimeoutRef = useRef<number | undefined>(undefined);
  const hasInitializedDraftSyncRef = useRef(false);

  const [draftItems, setDraftItems] = useState<DraftTimelineItem[]>(() =>
    [...lyricTexts].sort(compareTimelineItems).map(createDraftItem)
  );
  const [draftHistory, setDraftHistory] = useState<DraftTimelineItem[][]>([]);
  const [movedRowIds, setMovedRowIds] = useState<Set<number>>(new Set());
  const [newRowIds, setNewRowIds] = useState<Set<number>>(new Set());
  const [textEditorItemId, setTextEditorItemId] = useState<number | undefined>();
  const [isLyricsReferenceOpen, setIsLyricsReferenceOpen] = useState(false);

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

      if (newRowResetTimeoutRef.current !== undefined) {
        window.clearTimeout(newRowResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sortedLyricTexts = [...lyricTexts].sort(compareTimelineItems);

    setDraftItems((currentDraftItems) => {
      const currentDraftItemsById = new Map(
        currentDraftItems.map((draftItem) => [draftItem.item.id, draftItem])
      );
      const currentDraftItemIds = new Set(
        currentDraftItems.map((draftItem) => draftItem.item.id)
      );

      let hasStructuralChange = currentDraftItems.length !== sortedLyricTexts.length;
      const nextNewRowIds = new Set<number>();

      const nextDraftItems = sortedLyricTexts.map((item, index) => {
        const existingDraftItem = currentDraftItemsById.get(item.id);

        if (!existingDraftItem) {
          hasStructuralChange = true;
          if (hasInitializedDraftSyncRef.current && !currentDraftItemIds.has(item.id)) {
            nextNewRowIds.add(item.id);
          }
          return createDraftItem(item);
        }

        if (currentDraftItems[index]?.item.id !== item.id) {
          hasStructuralChange = true;
        }

        return {
          ...existingDraftItem,
          item,
        };
      });

      if (nextNewRowIds.size > 0) {
        setNewRowIds(nextNewRowIds);

        if (newRowResetTimeoutRef.current !== undefined) {
          window.clearTimeout(newRowResetTimeoutRef.current);
        }

        newRowResetTimeoutRef.current = window.setTimeout(() => {
          setNewRowIds(new Set());
        }, 1400);
      }

      hasInitializedDraftSyncRef.current = true;

      return hasStructuralChange ? nextDraftItems : currentDraftItems;
    });

    setTextEditorItemId((currentItemId) => {
      if (currentItemId === undefined) {
        return currentItemId;
      }

      return sortedLyricTexts.some((item) => item.id === currentItemId)
        ? currentItemId
        : undefined;
    });
  }, [lyricTexts]);

  function persistDraftItems(nextDraftItems: DraftTimelineItem[]) {
    const nextLyricTexts = normalizeLyricTextTimelineLevels(
      nextDraftItems
        .map((draftItem) => {
          const validation = validateDraftItem(draftItem, duration);
          return {
            ...draftItem.item,
            text: draftItem.textValue,
            start: validation.start ?? draftItem.item.start,
            end: validation.end ?? draftItem.item.end,
          };
        })
        .sort(compareTimelineItems)
    );

    useProjectStore.setState({ lyricTexts: nextLyricTexts });
  }

  function applyDraftItems(
    nextDraftItems: DraftTimelineItem[],
    { addToHistory = true }: { addToHistory?: boolean } = {}
  ) {
    if (addToHistory) {
      setDraftHistory((currentHistory) => [...currentHistory, draftItems]);
    }

    setDraftItems(nextDraftItems);
    persistDraftItems(nextDraftItems);
  }

  function updateDraftItem(
    itemId: number,
    key: "textValue" | "startText" | "endText",
    value: string
  ) {
    const nextDraftItems = draftItems.map((draftItem) => {
        if (draftItem.item.id !== itemId) {
          return draftItem;
        }

        return {
          ...draftItem,
          [key]: value,
        };
      });

    applyDraftItems(nextDraftItems);
  }

  function handleDeleteItem(itemId: number) {
    const nextDraftItems = draftItems.filter(
      (draftItem) => draftItem.item.id !== itemId
    );

    applyDraftItems(nextDraftItems);

    setTextEditorItemId((currentItemId) =>
      currentItemId === itemId ? undefined : currentItemId
    );
  }

  function handleRefreshOrder() {
    if (invalidRowCount > 0) {
      return;
    }

    const previousOrder = draftItems.map((draftItem) => draftItem.item.id);

    const refreshedDraftItems = draftItems
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

    applyDraftItems(refreshedDraftItems);
  }

  function handleUndo() {
    if (draftHistory.length === 0) {
      return;
    }

    const previousDraftItems = draftHistory[draftHistory.length - 1];
    setDraftHistory((currentHistory) => currentHistory.slice(0, -1));
    setDraftItems(previousDraftItems);
    persistDraftItems(previousDraftItems);
  }

  function handleClose() {
    onClose();
  }

  function handleRowClick(
    event: React.MouseEvent<HTMLDivElement>,
    draftItem: DraftTimelineItem,
    validation: DraftValidationResult
  ) {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button,input,textarea,label,[role='textbox'],[role='button']"
      )
    ) {
      return;
    }

    seek(validation.start ?? draftItem.item.start);
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
              <Flex direction="row" alignItems="center" gap="size-150" wrap>
                <PlayPauseButton
                  isPlaying={playing}
                  onPlayPauseClicked={togglePlayPause}
                />
                <View backgroundColor={"gray-100"} borderRadius={"regular"}>
                  <Flex
                    direction="row"
                    gap="size-100"
                    alignItems={"center"}
                    justifyContent={"space-between"}
                  >
                    <View width={50} padding={5}>
                      {formatDuration(position * 1000)}
                    </View>
                    /
                    <View width={50} padding={5}>
                      {formatDuration(duration * 1000)}
                    </View>
                  </Flex>
                </View>
                <Text>
                  {draftItems.length} item{draftItems.length === 1 ? "" : "s"}
                  {invalidRowCount > 0
                    ? `, ${invalidRowCount} row${invalidRowCount === 1 ? "" : "s"} need attention before saving.`
                    : ", ready to save."}
                </Text>
              </Flex>
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

            <Flex flex="1" direction="row" gap="size-150" minHeight={0} alignItems="stretch">
              <motion.div
                initial={false}
                animate={{
                  width: isLyricsReferenceOpen ? 340 : 0,
                  opacity: isLyricsReferenceOpen ? 1 : 0,
                  marginRight: isLyricsReferenceOpen ? 0 : -12,
                }}
                transition={{ duration: 0.28, ease: [0.2, 0.9, 0.25, 1] }}
                style={{ overflow: "hidden", minHeight: 0, flexShrink: 0 }}
              >
                <View
                  height="100%"
                  overflow="auto"
                  UNSAFE_style={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.02)",
                    minHeight: 0,
                  }}
                >
                  <View padding="size-200" borderBottomWidth="thin" borderColor="dark">
                    <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                      Lyrics Reference
                    </Text>
                    <View marginTop="size-50">
                      <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                        {lyricReference ? "Select text here for quick lyric insertion." : "Paste or edit lyric reference here."}
                      </Text>
                    </View>
                  </View>
                  <View padding="size-200">
                    <LyricReferenceView />
                  </View>
                </View>
              </motion.div>

              <View
                flex="1"
                position="relative"
                UNSAFE_style={{ minHeight: 0 }}
              >
                <ActionButton
                  aria-label={isLyricsReferenceOpen ? "Hide lyrics reference" : "Show lyrics reference"}
                  onPress={() => setIsLyricsReferenceOpen((current) => !current)}
                  UNSAFE_style={{
                    position: "absolute",
                    left: 0,
                    top: 22,
                    zIndex: 2,
                    width: 18,
                    minWidth: 18,
                    height: 92,
                    minHeight: 92,
                    padding: 0,
                    borderRadius: "0 12px 12px 0",
                    background: isLyricsReferenceOpen
                      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04))"
                      : "linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))",
                    border: "none",
                    boxShadow: isLyricsReferenceOpen
                      ? "inset -1px 0 0 rgba(255, 255, 255, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 24px rgba(0, 0, 0, 0.24)"
                      : "inset -1px 0 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                    color: isLyricsReferenceOpen
                      ? "rgba(255, 255, 255, 0.9)"
                      : "rgba(255, 255, 255, 0.62)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1,
                        opacity: isLyricsReferenceOpen ? 0.95 : 0.75,
                      }}
                    >
                      {isLyricsReferenceOpen ? "‹" : "›"}
                    </span>
                    <span
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        lineHeight: 1,
                        fontSize: 9,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                      }}
                    >
                      Lyrics
                    </span>
                  </div>
                </ActionButton>

                <View
                  height="100%"
                  overflow="auto"
                  UNSAFE_style={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.02)",
                    minHeight: 0,
                  }}
                >
                  <Flex direction="column" gap={0}>
                  {draftItems.map((draftItem, index) => {
                    const validation = validations[index];
                    const itemTypeAppearance = getItemTypeAppearance(draftItem.item);
                    const canEditText = !draftItem.item.isVisualizer && !draftItem.item.isImage;
                    const itemTitle = getItemTitle({
                      ...draftItem.item,
                      text: draftItem.textValue,
                    });
                    const start = validation.start ?? draftItem.item.start;
                    const end = validation.end ?? draftItem.item.end;
                    const isMoved = movedRowIds.has(draftItem.item.id);
                    const isNew = newRowIds.has(draftItem.item.id);
                    const isAtCursor = position >= start && position <= end;

                    return (
                      <motion.div
                        key={draftItem.item.id}
                        onClick={(event) => {
                          handleRowClick(event, draftItem, validation);
                        }}
                        initial={
                          isNew
                            ? { opacity: 0, y: 18, scale: 0.985 }
                            : false
                        }
                        layout
                        transition={{
                          layout: {
                            duration: 0.35,
                            ease: [0.2, 0.9, 0.25, 1],
                          },
                          opacity: { duration: 0.24, ease: "easeOut" },
                          y: { duration: 0.28, ease: [0.2, 0.9, 0.25, 1] },
                          scale: { duration: 0.28, ease: [0.2, 0.9, 0.25, 1] },
                          backgroundColor: { duration: 0.5 },
                          boxShadow: { duration: 0.5 },
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          backgroundColor: isMoved
                            ? "rgba(38, 128, 235, 0.12)"
                            : isNew
                            ? "rgba(104, 109, 244, 0.12)"
                            : "rgba(0, 0, 0, 0)",
                          boxShadow: isMoved
                            ? "inset 0 0 0 1px rgba(38, 128, 235, 0.22)"
                            : isNew
                            ? "inset 0 0 0 1px rgba(104, 109, 244, 0.24)"
                            : "inset 0 0 0 1px rgba(0, 0, 0, 0)",
                        }}
                        style={{ willChange: "transform" }}
                      >
                        <View
                          padding="size-200"
                          paddingStart="size-500"
                          borderBottomWidth={
                            index === draftItems.length - 1 ? undefined : "thin"
                          }
                          borderColor="dark"
                          UNSAFE_style={{
                            boxShadow: isAtCursor
                              ? "inset 2px 0 0 rgba(255, 255, 255, 0.28)"
                              : undefined,
                          }}
                        >
                          <Flex direction="column" gap="size-100">
                            <Flex
                              direction="row"
                              gap="size-200"
                              alignItems="start"
                              wrap
                            >
                              <Flex
                                alignItems="start"
                                gap="size-100"
                                minWidth="size-3000"
                                UNSAFE_style={{ flex: "1 1 340px" }}
                              >
                                {canEditText ? (
                                  <ActionButton
                                    aria-label="Open text settings"
                                    onPress={() => setTextEditorItemId(draftItem.item.id)}
                                    UNSAFE_style={{
                                      minWidth: 28,
                                      width: 28,
                                      height: 28,
                                      padding: 0,
                                      flexShrink: 0,
                                      borderRadius: 8,
                                      background: "rgba(255, 255, 255, 0.04)",
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      color: "rgba(255, 255, 255, 0.68)",
                                    }}
                                  >
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                  </ActionButton>
                                ) : (
                                  <View width="size-400" flexShrink={0} />
                                )}
                                <View flex>
                                  <Flex direction="row" alignItems="center" gap="size-75" wrap>
                                    <View
                                      width="size-50"
                                      height="size-50"
                                      UNSAFE_style={{
                                        borderRadius: 999,
                                        background: isAtCursor
                                          ? "rgba(255, 255, 255, 0.76)"
                                          : "rgba(255, 255, 255, 0.14)",
                                        boxShadow: isAtCursor
                                          ? "0 0 0 4px rgba(255, 255, 255, 0.08)"
                                          : "none",
                                        transition: "all 0.18s ease",
                                        marginTop: 3,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Text
                                      UNSAFE_style={{
                                        color: isAtCursor
                                          ? "rgba(255, 255, 255, 0.98)"
                                          : itemTypeAppearance.titleColor,
                                      }}
                                    >
                                      {itemTitle}
                                    </Text>
                                  </Flex>
                                  <View marginTop="size-50">
                                    <Flex
                                      direction="row"
                                      alignItems="center"
                                      gap="size-100"
                                      wrap
                                      UNSAFE_style={{ rowGap: 6 }}
                                    >
                                      <View
                                        paddingX="size-75"
                                        paddingY="size-10"
                                        UNSAFE_style={{
                                          background: itemTypeAppearance.chipBackground,
                                          border: `1px solid ${itemTypeAppearance.chipBorder}`,
                                          borderRadius: 999,
                                        }}
                                      >
                                        <Text
                                          UNSAFE_style={{
                                            color: itemTypeAppearance.chipColor,
                                            fontSize: 11,
                                          }}
                                        >
                                          {itemTypeAppearance.label}
                                        </Text>
                                      </View>
                                    </Flex>
                                  </View>
                                </View>
                              </Flex>

                              <Flex
                                direction="row"
                                gap="size-150"
                                alignItems="end"
                                wrap
                                UNSAFE_style={{
                                  flex: "0 1 auto",
                                  rowGap: 10,
                                }}
                              >
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
              </View>
            </Flex>
          </Flex>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            isDisabled={draftHistory.length === 0}
            onPress={handleUndo}
          >
            Undo
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