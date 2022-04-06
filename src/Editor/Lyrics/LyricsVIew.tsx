import React, { useEffect } from "react";
import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
import "./LyricsView.css";
import { useProjectStore } from "../../Project/store";

export default function LyricsView() {
  const lyricReference = useProjectStore((state) => state.lyricReference);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
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
    if (lyricReference) {
      setEditorState(
        EditorState.createWithContent(
          convertFromRaw(JSON.parse(lyricReference))
        )
      );
    } else {
      setEditorState(EditorState.createEmpty());
    }
  }, [lyricReference]);

  return (
    <div onClick={focusEditor}>
      <Editor
        ref={editor}
        editorState={editorState}
        onChange={(editorState: EditorState) => {
          setEditorState(editorState);
          setUnSavedLyricReference(
            JSON.stringify(convertToRaw(editorState.getCurrentContent()))
          );
        }}
      />
    </div>
  );
}
