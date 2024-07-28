import { ActionButton, Text } from "@adobe/react-spectrum";
import Edit from "@spectrum-icons/workflow/Edit";
import { useNavigate } from "react-router-dom";

export default function EditProjectButton() {
  const navigate = useNavigate();

  return (
    <ActionButton
      onPress={() => {
        navigate(`/edit`);
      }}
      isQuiet
    >
      <Edit />
      <Text>Edit</Text>
    </ActionButton>
  );
}
