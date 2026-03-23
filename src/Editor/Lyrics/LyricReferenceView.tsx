import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  CompositeDecorator,
  ContentBlock,
  ContentState,
  Editor,
  EditorState,
  convertFromRaw,
  convertToRaw,
  DraftHandleValue,
  RawDraftContentState,
} from "draft-js";
import { ToastQueue } from "@react-spectrum/toast";
import "./LyricsView.css";
import { generateLyricTextId, useProjectStore } from "../../Project/store";
import { useAudioPlayer, useAudioPosition } from "react-use-audio-player";
import LRCLIBSyncModal from "./LRCLIBSyncModal";
import {
  LRCLIBLyricsRecord,
  parseLRCLIBSyncedLyrics,
  parseLRCLIBTimestamp,
} from "../../api/lrclib";
import { useAIImageGeneratorStore } from "../Image/AI/store";
import { useProjectService } from "../../Project/useProjectService";
import { LyricText } from "../types";
import LRCLIBTimelineOffsetModal from "./LRCLIBTimelineOffsetModal";

function normalizeLyricText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function stripLRCLIBTimestamps(value: string) {
  return value.replace(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g, "");
}

function extractLRCLIBTimestamps(value: string) {
  return Array.from(value.matchAll(/\[(\d{1,2}:\d{2}(?:\.\d{1,3})?)\]/g)).map(
    (match) => parseLRCLIBTimestamp(match[1])
  );
}

function getNormalizedBlockText(value: string) {
  return normalizeLyricText(stripLRCLIBTimestamps(value));
}

function getLyricContentRange(value: string) {
  const withoutTimestamps = stripLRCLIBTimestamps(value);
  const leadingWhitespaceLength = withoutTimestamps.match(/^\s*/)?.[0].length ?? 0;
  const trailingWhitespaceLength = withoutTimestamps.match(/\s*$/)?.[0].length ?? 0;
  const visibleLength = withoutTimestamps.length - leadingWhitespaceLength - trailingWhitespaceLength;

  if (visibleLength <= 0) {
    return undefined;
  }

  const firstVisibleCharacter = withoutTimestamps[leadingWhitespaceLength];
  const start = value.indexOf(firstVisibleCharacter);

  if (start === -1) {
    return undefined;
  }

  return {
    start,
    end: start + visibleLength,
  };
}

function findLyricMatchRange(blockText: string, normalizedTargetText: string) {
  const contentRange = getLyricContentRange(blockText);

  if (!contentRange) {
    return undefined;
  }

  const lyricText = blockText.slice(contentRange.start, contentRange.end);
  const normalizedLyricText = normalizeLyricText(lyricText);

  if (normalizedLyricText !== normalizedTargetText) {
    return undefined;
  }

  return contentRange;
}

function getTrimmedRange(value: string) {
  const start = value.search(/\S/);
  if (start === -1) {
    return undefined;
  }

  return {
    start,
    end: value.trimEnd().length,
  };
}

interface TimedReferenceBlock {
  key: string;
  startTime: number;
  endTime: number;
  lyricRange?: { start: number; end: number };
}

function buildTimedReferenceBlocks(rawLyricReference?: RawDraftContentState) {
  if (!rawLyricReference?.blocks?.length) {
    return [] as TimedReferenceBlock[];
  }

  const timedBlocks = rawLyricReference.blocks
    .map((block) => {
      const timestamps = extractLRCLIBTimestamps(block.text);

      if (timestamps.length === 0) {
        return undefined;
      }

      return {
        key: block.key,
        startTime: Math.min(...timestamps),
        lyricRange: getLyricContentRange(block.text) ?? getTrimmedRange(block.text),
      };
    })
    .filter(
      (
        block
      ): block is {
        key: string;
        startTime: number;
        lyricRange?: { start: number; end: number };
      } => Boolean(block)
    )
    .sort((left, right) => left.startTime - right.startTime);

  return timedBlocks.map((block, index) => ({
    ...block,
    endTime: timedBlocks[index + 1]?.startTime ?? Number.POSITIVE_INFINITY,
  }));
}

function buildTimelineLyricsFromLRCLIB(
  record: LRCLIBLyricsRecord,
  offsetSeconds: number = 0,
  clipDurationSeconds?: number
): LyricText[] {
  const normalizedOffset = Math.max(0, offsetSeconds);
  const rawSyncedLines = parseLRCLIBSyncedLyrics(record.syncedLyrics).filter(
    (line) => line.text.trim().length > 0
  );
  const syncedLines = rawSyncedLines.filter((line, index) => {
    if (line.time >= normalizedOffset) {
      return true;
    }

    const nextLine = rawSyncedLines[index + 1];
    return Boolean(nextLine && nextLine.time > normalizedOffset);
  });
  const effectiveClipDuration =
    clipDurationSeconds !== undefined && Number.isFinite(clipDurationSeconds) && clipDurationSeconds > 0
      ? clipDurationSeconds
      : undefined;

  return syncedLines.map((line, index) => {
    const nextLine = syncedLines[index + 1];
    const shiftedStart = Math.max(0, line.time - normalizedOffset);
    const fallbackEnd = Math.min(
      effectiveClipDuration ?? Math.max(0, record.duration - normalizedOffset),
      shiftedStart + 3
    );
    const nextBoundary = nextLine
      ? Math.max(0, nextLine.time - normalizedOffset)
      : fallbackEnd;
    const clippedEnd =
      effectiveClipDuration !== undefined
        ? Math.min(effectiveClipDuration, nextBoundary)
        : nextBoundary;

    return {
      id: generateLyricTextId() + index,
      start: shiftedStart,
      end: Math.max(shiftedStart + 0.25, clippedEnd),
      text: line.text,
      textX: 0.5,
      textY: 0.5,
      textBoxTimelineLevel: 1,
      fontName: "Inter Variable",
      fontWeight: 400,
    };
  });
}

export default function LyricReferenceView() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const [saveProject] = useProjectService();
  const [editorState, setEditorState] = useState<EditorState>(
    EditorState.createEmpty()
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isTimelineOffsetModalOpen, setIsTimelineOffsetModalOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");

  const editorContainer = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const editor = useRef<Editor | null>(null);
  const { playing, togglePlayPause, pause } = useAudioPlayer();

  const { position, duration, seek } = useAudioPosition({
    highRefreshRate: false,
  });

  const existingTimelineLyricItemCount = React.useMemo(
    () =>
      lyricTexts.filter((item) => !item.isImage && !item.isVisualizer).length,
    [lyricTexts]
  );

  const rawLyricReference = React.useMemo(() => {
    if (!lyricReference) {
      return undefined;
    }

    try {
      return JSON.parse(lyricReference) as RawDraftContentState;
    } catch {
      return undefined;
    }
  }, [lyricReference]);

  const timedReferenceBlocks = React.useMemo(
    () => buildTimedReferenceBlocks(rawLyricReference),
    [rawLyricReference]
  );

  const shouldUseLRCLIBAutoHighlight =
    Boolean(editingProject?.lrclib?.syncedLyrics) && timedReferenceBlocks.length > 0;

  const activeTimedReferenceBlock = React.useMemo(() => {
    if (!shouldUseLRCLIBAutoHighlight) {
      return undefined;
    }

    const adjustedPosition = position + (editingProject?.lrclibOffsetSeconds ?? 0);

    return timedReferenceBlocks.find(
      (block) => adjustedPosition >= block.startTime && adjustedPosition < block.endTime
    );
  }, [
    editingProject?.lrclibOffsetSeconds,
    position,
    shouldUseLRCLIBAutoHighlight,
    timedReferenceBlocks,
  ]);

  const currentCursorLyricContext = React.useMemo(() => {
    const orderedLyricItems = [...lyricTexts]
      .filter(
        (item) =>
          !item.isImage && !item.isVisualizer && item.text.trim().length > 0
      )
      .sort((left, right) => {
        if (left.start !== right.start) {
          return left.start - right.start;
        }

        if (left.end !== right.end) {
          return left.end - right.end;
        }

        return left.id - right.id;
      });

    const activeLyricItems = orderedLyricItems.filter(
      (item) => position >= item.start && position <= item.end
    );
    const activeTexts = activeLyricItems.map((item) => item.text.trim()).filter(Boolean);
    const activePhraseText = activeTexts.join(" ").trim();

    const currentIndex = orderedLyricItems.findIndex(
      (item) => position >= item.start && position <= item.end
    );

    if (currentIndex === -1) {
      return {
        text: "",
        phraseText: "",
        previousText: "",
        nextText: "",
        requiresContext: false,
      };
    }

    const currentText = orderedLyricItems[currentIndex].text.trim();
    const normalizedCurrentText = normalizeLyricText(currentText);
    const wordCount = normalizedCurrentText.length === 0 ? 0 : normalizedCurrentText.split(" ").length;

    return {
      text: currentText,
      phraseText: activePhraseText,
      previousText: orderedLyricItems[currentIndex - 1]?.text.trim() || "",
      nextText: orderedLyricItems[currentIndex + 1]?.text.trim() || "",
      requiresContext: wordCount === 1 && normalizedCurrentText.length <= 4,
    };
  }, [lyricTexts, position]);

  const autoHighlightDecorator = React.useMemo(() => {
    if (shouldUseLRCLIBAutoHighlight) {
      return new CompositeDecorator([
        {
          strategy(contentBlock: ContentBlock, callback: (start: number, end: number) => void) {
            if (!activeTimedReferenceBlock) {
              return;
            }

            if (contentBlock.getKey() !== activeTimedReferenceBlock.key) {
              return;
            }

            const blockText = contentBlock.getText();
            const activeRange =
              activeTimedReferenceBlock.lyricRange ??
              getLyricContentRange(blockText) ??
              getTrimmedRange(blockText);

            if (activeRange) {
              callback(activeRange.start, activeRange.end);
            }
          },
          component: function AutoHighlightMatch(props: { children?: React.ReactNode }) {
            return (
              <span className="lyric-reference-auto-highlight">{props.children}</span>
            );
          },
        },
      ]);
    }

    if (!currentCursorLyricContext.text) {
      return new CompositeDecorator([]);
    }

    const normalizedCurrentCursorLyricText = normalizeLyricText(currentCursorLyricContext.text);
    const normalizedCurrentCursorLyricPhrase = normalizeLyricText(
      currentCursorLyricContext.phraseText
    );
    const normalizedPreviousText = normalizeLyricText(currentCursorLyricContext.previousText);
    const normalizedNextText = normalizeLyricText(currentCursorLyricContext.nextText);

    return new CompositeDecorator([
      {
        strategy(
          contentBlock: ContentBlock,
          callback: (start: number, end: number) => void,
          contentState: ContentState
        ) {
          const blockText = contentBlock.getText();
          const normalizedBlockText = getNormalizedBlockText(blockText);

          if (
            normalizedCurrentCursorLyricPhrase.length > 0 &&
            normalizedCurrentCursorLyricPhrase !== normalizedCurrentCursorLyricText
          ) {
            const phraseMatchRange = findLyricMatchRange(
              blockText,
              normalizedCurrentCursorLyricPhrase
            );

            if (phraseMatchRange) {
              callback(phraseMatchRange.start, phraseMatchRange.end);
              return;
            }
          }

          if (currentCursorLyricContext.requiresContext) {
            if (getNormalizedBlockText(blockText) !== normalizedCurrentCursorLyricText) {
              return;
            }

            const blocks = contentState.getBlocksAsArray();
            const blockIndex = blocks.findIndex((block) => block.getKey() === contentBlock.getKey());
            const previousBlockText =
              blockIndex > 0 ? getNormalizedBlockText(blocks[blockIndex - 1].getText()) : "";
            const nextBlockText =
              blockIndex >= 0 && blockIndex < blocks.length - 1
                ? getNormalizedBlockText(blocks[blockIndex + 1].getText())
                : "";

            const hasPreviousMatch =
              normalizedPreviousText.length > 0 && previousBlockText === normalizedPreviousText;
            const hasNextMatch =
              normalizedNextText.length > 0 && nextBlockText === normalizedNextText;

            if (!hasPreviousMatch && !hasNextMatch) {
              return;
            }

            const lyricRange = getLyricContentRange(blockText) ?? getTrimmedRange(blockText);
            if (lyricRange) {
              callback(lyricRange.start, lyricRange.end);
            }
            return;
          }

          const exactLyricRange = findLyricMatchRange(
            blockText,
            normalizedCurrentCursorLyricText
          );

          if (exactLyricRange) {
            callback(exactLyricRange.start, exactLyricRange.end);
          }
        },
        component: function AutoHighlightMatch(props: { children?: React.ReactNode }) {
          return (
            <span className="lyric-reference-auto-highlight">{props.children}</span>
          );
        },
      },
    ]);
  }, [activeTimedReferenceBlock, currentCursorLyricContext, shouldUseLRCLIBAutoHighlight]);

  function focusEditor() {
    if (editor.current !== null) {
      editor.current.focus();
    }
  }

  const closeContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
    setSelectedText("");
  }, []);

  const getSelectionTextInsideEditor = useCallback(() => {
    const container = editorContainer.current;
    const selection = window.getSelection();

    if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return undefined;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return undefined;
    }

    const selectedValue = selection.toString().trim();
    return selectedValue || undefined;
  }, []);

  const handleEditorContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const container = editorContainer.current;
      const selection = window.getSelection();
      const nextSelectedText = getSelectionTextInsideEditor();
      if (!container || !selection || selection.rangeCount === 0 || !nextSelectedText) {
        closeContextMenu();
        return;
      }

      event.preventDefault();

      const range = selection.getRangeAt(0);
      const selectionRect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const menuWidth = 160;
      const menuHeight = 44;
      const viewportPadding = 12;
      const horizontalGap = 10;
      const verticalGap = 6;

      const maxLeft = Math.max(
        viewportPadding,
        container.clientWidth - menuWidth - viewportPadding
      );
      const maxTop = Math.max(
        viewportPadding,
        container.clientHeight - menuHeight - viewportPadding
      );

      let left =
        selectionRect.right - containerRect.left + container.scrollLeft + horizontalGap;
      let top =
        selectionRect.top - containerRect.top + container.scrollTop + verticalGap;

      if (left > maxLeft) {
        left = Math.max(
          viewportPadding,
          selectionRect.left - containerRect.left + container.scrollLeft - menuWidth - horizontalGap
        );
      }

      if (top > maxTop) {
        top = Math.max(
          viewportPadding,
          selectionRect.bottom - containerRect.top + container.scrollTop - menuHeight - verticalGap
        );
      }

      setSelectedText(nextSelectedText);
      setContextMenuPosition({
        top: Math.min(maxTop, Math.max(viewportPadding, top)),
        left: Math.min(maxLeft, Math.max(viewportPadding, left)),
      });
      setIsContextMenuOpen(true);
    },
    [closeContextMenu, getSelectionTextInsideEditor]
  );

  const handleAddSelectionToTimeline = useCallback(() => {
    if (!selectedText) {
      return;
    }

    addNewLyricText(selectedText, position, false, "", false, undefined);
    closeContextMenu();
  }, [addNewLyricText, closeContextMenu, position, selectedText]);

  useEffect(() => {
    if (rawLyricReference) {
      setEditorState(
        EditorState.createWithContent(
          convertFromRaw(rawLyricReference),
          autoHighlightDecorator
        )
      );
    } else {
      setEditorState(EditorState.createEmpty(autoHighlightDecorator));
    }
  }, [autoHighlightDecorator, rawLyricReference]);

  useEffect(() => {
    setEditorState((currentEditorState) =>
      EditorState.set(currentEditorState, {
        decorator: autoHighlightDecorator,
      })
    );
  }, [autoHighlightDecorator]);

  const handleEditorChange = (editorState: EditorState) => {
    setEditorState(editorState);
    setUnSavedLyricReference(
      JSON.stringify(convertToRaw(editorState.getCurrentContent()))
    );
  };

  useEffect(() => {
    if (!isContextMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        closeContextMenu();
        return;
      }

      if (!contextMenuRef.current?.contains(target)) {
        closeContextMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    const handleWindowChange = () => {
      closeContextMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeContextMenu, isContextMenuOpen]);

  const handleEditorKeyCommand = useCallback(
    (command: string): DraftHandleValue => {
      if (command === "escape") {
        closeContextMenu();
        return "handled";
      }

      return "not-handled";
    },
    [closeContextMenu]
  );

  async function handleUseLRCLIBMatch(record: LRCLIBLyricsRecord) {
    if (!record.syncedLyrics || !editingProject) {
      return;
    }

    const nextLyricReference = JSON.stringify(
      convertToRaw(ContentState.createFromText(record.syncedLyrics))
    );

    const updatedProjectDetail = {
      ...editingProject,
      lrclib: record,
    };

    const projectState = useProjectStore.getState();
    const aiState = useAIImageGeneratorStore.getState();

    setEditingProject(updatedProjectDetail);
    setLyricReference(nextLyricReference);
    setUnSavedLyricReference(nextLyricReference);

    await saveProject({
      id: updatedProjectDetail.name,
      projectDetail: updatedProjectDetail,
      lyricTexts: projectState.lyricTexts,
      lyricReference: nextLyricReference,
      generatedImageLog: aiState.generatedImageLog,
      promptLog: aiState.promptLog,
      images: projectState.images,
    });
  }

  function handleOpenLRCLIBTimelineOffsetModal() {
    const lrclibRecord = editingProject?.lrclib;

    if (!lrclibRecord?.syncedLyrics) {
      ToastQueue.negative("Sync lyrics from LRCLIB first", { timeout: 3000 });
      return;
    }

    pause();
    seek(0);
    setIsTimelineOffsetModalOpen(true);
  }

  async function handleAddLRCLIBLyricsToTimeline(offsetSeconds: number) {
    const lrclibRecord = editingProject?.lrclib;

    if (!lrclibRecord?.syncedLyrics || !editingProject) {
      ToastQueue.negative("Sync lyrics from LRCLIB first", { timeout: 3000 });
      return;
    }

    const nextTimelineLyrics = buildTimelineLyricsFromLRCLIB(
      lrclibRecord,
      offsetSeconds,
      duration
    );

    if (nextTimelineLyrics.length === 0) {
      ToastQueue.negative("No timed LRCLIB lyric lines were found", {
        timeout: 3000,
      });
      return;
    }

    const preservedItems = lyricTexts.filter(
      (item) => item.isImage || item.isVisualizer
    );
    const nextLyricTexts = [...preservedItems, ...nextTimelineLyrics];
    const updatedProjectDetail = {
      ...editingProject,
      lrclibOffsetSeconds: offsetSeconds,
    };
    const projectState = useProjectStore.getState();
    const aiState = useAIImageGeneratorStore.getState();

    setEditingProject(updatedProjectDetail);
    setLyricTexts(nextLyricTexts);
    pause();

    await saveProject({
      id: updatedProjectDetail.name,
      projectDetail: updatedProjectDetail,
      lyricTexts: nextLyricTexts,
      lyricReference: projectState.unSavedLyricReference ?? projectState.lyricReference,
      generatedImageLog: aiState.generatedImageLog,
      promptLog: aiState.promptLog,
      images: projectState.images,
    });

    setIsTimelineOffsetModalOpen(false);
  }

  return (
    <>
      <div className="lyric-reference-view">
        <div
          ref={editorContainer}
          className="lyric-reference-editor-shell"
          onClick={focusEditor}
          onContextMenu={handleEditorContextMenu}
        >
          <Editor
            ref={editor}
            editorState={editorState}
            onChange={handleEditorChange}
            handleKeyCommand={handleEditorKeyCommand}
            placeholder="Paste lyrics here"
          />
          {isContextMenuOpen && (
            <div
              ref={contextMenuRef}
              style={{
                position: "absolute",
                top: `${contextMenuPosition.top}px`,
                left: `${contextMenuPosition.left}px`,
                zIndex: 10001,
                minWidth: 160,
                backgroundColor: "rgb(30, 33, 38)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: 10,
                padding: 4,
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              <button
                onClick={handleAddSelectionToTimeline}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 12px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  color: "rgba(255, 255, 255, 0.86)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Add to timeline
              </button>
            </div>
          )}
        </div>

        <div className="lyric-reference-toolbar">
          <div className="lyric-reference-toolbar-title">Actions</div>
          <div className="lyric-reference-toolbar-actions">
            <button
              type="button"
              className="lyric-reference-toolbar-button"
              onClick={() => setIsSyncModalOpen(true)}
              aria-label="Sync from LRCLIB"
              title="Sync from LRCLIB"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-15.5-6.36L3 8" />
                <path d="M3 12a9 9 0 0 0 15.5 6.36L21 16" />
                <polyline points="3 3 3 8 8 8" />
                <polyline points="16 16 21 16 21 21" />
              </svg>
            </button>
            <button
              type="button"
              className="lyric-reference-toolbar-button"
              onClick={handleOpenLRCLIBTimelineOffsetModal}
              aria-label="Add synced lyrics to timeline"
              title="Add synced lyrics to timeline"
              disabled={!editingProject?.lrclib?.syncedLyrics}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <polyline points="3 12 5 14 9 10" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <LRCLIBSyncModal
        open={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        initialTrackName={
          editingProject?.songName || editingProject?.appleMusicTrackName || editingProject?.name || ""
        }
        initialArtistName={editingProject?.artistName ?? ""}
        initialAlbumName={""}
        initialAudioUrl={editingProject?.audioFileUrl}
        initialAppleMusicAlbumUrl={editingProject?.appleMusicAlbumUrl}
        onUseMatch={handleUseLRCLIBMatch}
      />
      <LRCLIBTimelineOffsetModal
        open={isTimelineOffsetModalOpen}
        onClose={() => {
          pause();
          setIsTimelineOffsetModalOpen(false);
        }}
        onConfirm={handleAddLRCLIBLyricsToTimeline}
        initialOffsetSeconds={editingProject?.lrclibOffsetSeconds ?? 0}
        existingLyricItemCount={existingTimelineLyricItemCount}
        playing={playing}
        clipPositionSeconds={position}
        clipDurationSeconds={duration}
        songDurationSeconds={editingProject?.lrclib?.duration ?? 0}
        onTogglePlayPause={togglePlayPause}
        onSeekClip={seek}
      />
    </>
  );
}
