import { ActionButton, Button, Text } from "@adobe/react-spectrum";
import { saveProject, useProjectStore } from "./store";

export default function SaveButton() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const unSavedLyricReference = useProjectStore((state) => state.unSavedLyricReference);

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
          });
          
        }
      }}
    >
      <Text>Save</Text>
    </Button>
  );
}
