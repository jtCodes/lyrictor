import { ActionButton, Button, Text } from "@adobe/react-spectrum";
import { useAIImageGeneratorStore } from "../Editor/Lyrics/Image/store";
import { saveProject, useProjectStore } from "./store";

export default function SaveButton() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const unSavedLyricReference = useProjectStore(
    (state) => state.unSavedLyricReference
  );
  const generatedImageLog = useAIImageGeneratorStore(
    (state) => state.generatedImageLog
  );
  const promptLog = useAIImageGeneratorStore((state) => state.promptLog);

  return (
    <Button
      variant={"primary"}
      onPress={() => {
        if (editingProject) {
          saveProject({
            id: editingProject.name,
            projectDetail: editingProject,
            lyricTexts,
            lyricReference: unSavedLyricReference,
            generatedImageLog,
            promptLog,
          });
        }
      }}
    >
      <Text>Save</Text>
    </Button>
  );
}
