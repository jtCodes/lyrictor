import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Editor,
  EditorState,
  convertFromRaw,
  convertToRaw,
  RawDraftContentState,
} from "draft-js";
import "./LyricsView.css";
import { useProjectStore } from "../../Project/store";
import AddLyricTextButton from "../AudioTimeline/Tools/AddLyricTextButton";
import { useAudioPosition } from "react-use-audio-player";

const useDebounce = (callback: Function, delay: number) => {
  const timer = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: any[]) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

export default function LyricReferenceView() {
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const [editorState, setEditorState] = useState<EditorState>(
    EditorState.createEmpty()
  );
  const [showButton, setShowButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState(""); // Add state variable to store selected text

  const editorContainer = useRef<HTMLDivElement | null>(null);
  const editor = useRef<Editor | null>(null);

  const { position } = useAudioPosition({
    highRefreshRate: false,
  });

  function focusEditor() {
    if (editor.current !== null) {
      editor.current.focus();
    }
  }

  useEffect(() => {
    if (lyricReference) {
      setEditorState(
        EditorState.createWithContent(
          convertFromRaw(JSON.parse(lyricReference) as RawDraftContentState)
        )
      );
    } else {
      setEditorState(EditorState.createEmpty());
    }
  }, [lyricReference]);

  const handleEditorChange = (editorState: EditorState) => {
    setEditorState(editorState);
    setUnSavedLyricReference(
      JSON.stringify(convertToRaw(editorState.getCurrentContent()))
    );
    debouncedUpdateButtonPosition(editorState);
  };

  const debouncedUpdateButtonPosition = useDebounce(
    (editorState: EditorState) => {
      const selectionState = editorState.getSelection();
      const anchorKey = selectionState.getAnchorKey();
      const currentContent = editorState.getCurrentContent();
      const currentBlock = currentContent.getBlockForKey(anchorKey);
      const blockText = currentBlock.getText();
      const selectedText = blockText.slice(
        selectionState.getStartOffset(),
        selectionState.getEndOffset()
      );

      setSelectedText(selectedText); // Store the selected text in state

      if (selectedText) {
        const selectionCoords = getSelectionCoords();
        if (selectionCoords) {
          setButtonPosition(selectionCoords);
          setShowButton(true);
        }
      } else {
        setShowButton(false);
      }
    },
    100
  );

  const getSelectionCoords = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorContainer.current?.getBoundingClientRect();
    if (!editorRect) {
      return null;
    }

    if (editorContainer.current) {
      return {
        top: rect.top - editorRect.top + editorContainer.current.scrollTop,
        left:
          rect.right -
          editorRect.left +
          editorContainer.current.scrollLeft +
          10,
      };
    }
  };

  return (
    <div
      ref={editorContainer}
      onClick={focusEditor}
      style={{ position: "relative" }}
    >
      <Editor
        ref={editor}
        editorState={editorState}
        onChange={handleEditorChange}
      />
      {showButton && (
        <div
          style={{
            position: "absolute",
            top: `${buttonPosition.top - 5}px`,
            left: `${buttonPosition.left}px`,
          }}
        >
          <AddLyricTextButton position={position} text={selectedText} />
        </div>
      )}
    </div>
  );
}
