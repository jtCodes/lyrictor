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
import "./LyricsView.css";
import { useProjectStore } from "../../Project/store";
import { useAudioPosition } from "react-use-audio-player";
import LRCLIBSyncModal from "./LRCLIBSyncModal";
import { LRCLIBLyricsRecord } from "../../api/lrclib";

function normalizeLyricText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
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

export default function LyricReferenceView() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const [editorState, setEditorState] = useState<EditorState>(
    EditorState.createEmpty()
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");

  const editorContainer = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const editor = useRef<Editor | null>(null);

  const { position } = useAudioPosition({
    highRefreshRate: false,
  });

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
          const normalizedBlockText = blockText.toLocaleLowerCase();

          if (
            normalizedCurrentCursorLyricPhrase.length > 0 &&
            normalizedCurrentCursorLyricPhrase !== normalizedCurrentCursorLyricText
          ) {
            let phraseMatchIndex = normalizedBlockText.indexOf(
              normalizedCurrentCursorLyricPhrase
            );

            while (phraseMatchIndex !== -1) {
              callback(
                phraseMatchIndex,
                phraseMatchIndex + currentCursorLyricContext.phraseText.length
              );
              phraseMatchIndex = normalizedBlockText.indexOf(
                normalizedCurrentCursorLyricPhrase,
                phraseMatchIndex + currentCursorLyricContext.phraseText.length
              );
            }

            if (normalizedBlockText.includes(normalizedCurrentCursorLyricPhrase)) {
              return;
            }
          }

          if (currentCursorLyricContext.requiresContext) {
            if (normalizeLyricText(blockText) !== normalizedCurrentCursorLyricText) {
              return;
            }

            const blocks = contentState.getBlocksAsArray();
            const blockIndex = blocks.findIndex((block) => block.getKey() === contentBlock.getKey());
            const previousBlockText =
              blockIndex > 0 ? normalizeLyricText(blocks[blockIndex - 1].getText()) : "";
            const nextBlockText =
              blockIndex >= 0 && blockIndex < blocks.length - 1
                ? normalizeLyricText(blocks[blockIndex + 1].getText())
                : "";

            const hasPreviousMatch =
              normalizedPreviousText.length > 0 && previousBlockText === normalizedPreviousText;
            const hasNextMatch =
              normalizedNextText.length > 0 && nextBlockText === normalizedNextText;

            if (!hasPreviousMatch && !hasNextMatch) {
              return;
            }

            const trimmedRange = getTrimmedRange(blockText);
            if (trimmedRange) {
              callback(trimmedRange.start, trimmedRange.end);
            }
            return;
          }

          let matchIndex = normalizedBlockText.indexOf(normalizedCurrentCursorLyricText);

          while (matchIndex !== -1) {
            callback(matchIndex, matchIndex + currentCursorLyricContext.text.length);
            matchIndex = normalizedBlockText.indexOf(
              normalizedCurrentCursorLyricText,
              matchIndex + currentCursorLyricContext.text.length
            );
          }
        },
        component: function AutoHighlightMatch(props: { children?: React.ReactNode }) {
          return (
            <span className="lyric-reference-auto-highlight">{props.children}</span>
          );
        },
      },
    ]);
  }, [currentCursorLyricContext]);

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
    if (lyricReference) {
      setEditorState(
        EditorState.createWithContent(
          convertFromRaw(JSON.parse(lyricReference) as RawDraftContentState),
          autoHighlightDecorator
        )
      );
    } else {
      setEditorState(EditorState.createEmpty(autoHighlightDecorator));
    }
  }, [autoHighlightDecorator, lyricReference]);

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
    if (!record.syncedLyrics) {
      return;
    }

    const nextLyricReference = JSON.stringify(
      convertToRaw(ContentState.createFromText(record.syncedLyrics))
    );

    setLyricReference(nextLyricReference);
    setUnSavedLyricReference(nextLyricReference);
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
          <div className="lyric-reference-toolbar-copy">
            <div className="lyric-reference-toolbar-title">Optional</div>
            <div className="lyric-reference-toolbar-description">
              Try LRCLIB if you want a rough starting pass for timed lines.
            </div>
          </div>
          <button
            type="button"
            className="lyric-reference-toolbar-button"
            onClick={() => setIsSyncModalOpen(true)}
          >
            Sync From LRCLIB
          </button>
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
    </>
  );
}
