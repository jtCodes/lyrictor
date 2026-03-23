import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  CompositeDecorator,
  ContentBlock,
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

export default function LyricReferenceView() {
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const [editorState, setEditorState] = useState<EditorState>(
    EditorState.createEmpty()
  );
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");

  const editorContainer = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const editor = useRef<Editor | null>(null);

  const { position } = useAudioPosition({
    highRefreshRate: false,
  });

  const currentCursorLyricText = React.useMemo(() => {
    const currentLyricItem = lyricTexts.find(
      (item) =>
        !item.isImage &&
        !item.isVisualizer &&
        item.text.trim().length > 0 &&
        position >= item.start &&
        position <= item.end
    );

    return currentLyricItem?.text.trim() || "";
  }, [lyricTexts, position]);

  const autoHighlightDecorator = React.useMemo(() => {
    if (!currentCursorLyricText) {
      return new CompositeDecorator([]);
    }

    return new CompositeDecorator([
      {
        strategy(contentBlock: ContentBlock, callback: (start: number, end: number) => void) {
          const blockText = contentBlock.getText();
          let matchIndex = blockText.indexOf(currentCursorLyricText);

          while (matchIndex !== -1) {
            callback(matchIndex, matchIndex + currentCursorLyricText.length);
            matchIndex = blockText.indexOf(
              currentCursorLyricText,
              matchIndex + currentCursorLyricText.length
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
  }, [currentCursorLyricText]);

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

  return (
    <div
      ref={editorContainer}
      onClick={focusEditor}
      onContextMenu={handleEditorContextMenu}
      style={{ position: "relative" }}
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
  );
}
