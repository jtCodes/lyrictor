import { Picker, Item } from "@adobe/react-spectrum";
import { EditingMode } from "./types";

interface EditingModePickerProps {
  isRequired?: boolean;
  selectedMode?: EditingMode;
  onModeChange: (mode: EditingMode) => void;
}

export default function EditingModePicker({
  isRequired = true,
  selectedMode,
  onModeChange,
}: EditingModePickerProps) {
  return (
    <Picker
      isRequired={isRequired}
      label="Select Editing Mode"
      width="size-4400"
      items={["19/8"]}
      defaultSelectedKey={EditingMode.free}
      onSelectionChange={(key) => onModeChange(key as EditingMode)}
    >
      <Item key={EditingMode["free"]}>{"Freestyle"}</Item>
      <Item key={EditingMode["static"]}>
        {"Linear synced (Apple Music style)"}
      </Item>
    </Picker>
  );
}
