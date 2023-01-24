import { Button, Text } from "@adobe/react-spectrum";

export default function DeleteImageButton() {
  function onPress() {}

  return (
    <Button variant="negative" onPress={onPress} width={"140px"} style={"fill"}>
      <Text>Delete Selected</Text>
    </Button>
  );
}
