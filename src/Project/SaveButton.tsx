import { ActionButton, Button, Text } from "@adobe/react-spectrum";
import { saveProject, useProjectStore } from "./store";

export default function SaveButton() {
  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);

  return (
    <Button
      variant={"primary"}
      onPress={() => {
          console.log(editingProject)
        if (editingProject) {
          saveProject({
            id: editingProject.name,
            projectDetail: editingProject,
            lyricTexts,
          });
        }
      }}
    >
      <Text>Save</Text>
    </Button>
  );
}
