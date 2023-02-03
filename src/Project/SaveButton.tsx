import { Button, Text } from "@adobe/react-spectrum";
import { useProjectStore } from "./store";
import { useProjectService } from "./useProjectService";

export default function SaveButton() {
  const [saveProject] = useProjectService();
  const editingProject = useProjectStore((state) => state.editingProject);

  function isDemoProject() {
    return editingProject?.name.includes("(Demo)");
  }

  if (isDemoProject()) {
    return null
  }

  return (
    <Button
      variant={"primary"}
      onPress={() => {
        saveProject();
      }}
    >
      <Text>Save</Text>
    </Button>
  );
}
