import { Button, Text } from "@adobe/react-spectrum";
import { useProjectService } from "./useProjectService";

export default function SaveButton() {
  const [saveProject] = useProjectService();
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
