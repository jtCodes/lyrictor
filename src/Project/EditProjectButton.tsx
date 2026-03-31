import { ActionButton, Text } from "@adobe/react-spectrum";
import Edit from "@spectrum-icons/workflow/Edit";
import { useNavigate } from "react-router-dom";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../theme";

export default function EditProjectButton() {
  const navigate = useNavigate();

  return (
    <ActionButton
      onPress={() => {
        navigate(`/edit`);
      }}
      isQuiet
      UNSAFE_className={HEADER_BUTTON_CLASS}
      UNSAFE_style={headerButtonStyle(false)}
    >
      <Edit />
      <Text>Edit</Text>
    </ActionButton>
  );
}
