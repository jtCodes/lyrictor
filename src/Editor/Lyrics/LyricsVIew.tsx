import React, { useEffect } from "react";
import {
  Editor,
  EditorState,
  convertFromRaw,
  convertToRaw,
  ContentState,
} from "draft-js";
import "./LyricsView.css";
import { useProjectStore } from "../../Project/store";

export default function LyricsView({
  lyricReference,
}: {
  lyricReference: string;
}) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const [editorState, setEditorState] = React.useState(
    EditorState.createEmpty()
  );

  const editor = React.useRef<any>(null);

  function focusEditor() {
    if (null !== editor.current) {
      editor.current.focus();
    }
  }

  useEffect(() => {
    focusEditor();
  }, []);

  useEffect(() => {
    const loadedState = lyricReference as any;
    if (loadedState.blocks) {
      setEditorState(
        EditorState.createWithContent(convertFromRaw(loadedState))
      );
    } 
  }, [editingProject]);

  return (
    <div onClick={focusEditor}>
      <Editor
        ref={editor}
        editorState={editorState}
        onChange={(editorState: EditorState) => {
          setEditorState(editorState);
          setLyricReference(
            JSON.stringify(convertToRaw(editorState.getCurrentContent()))
          );
        }}
      />
    </div>
  );
}
