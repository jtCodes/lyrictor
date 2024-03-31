import { Picker, Item } from "@adobe/react-spectrum";
import { VideoResolution } from "./types";

interface ResolutionPickerProps {
  isRequired?: boolean;
  selectedResolution?: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
}

export default function ResolutionPicker({
  isRequired = true,
  selectedResolution,
  onResolutionChange,
}: ResolutionPickerProps) {
  return (
    <Picker
      isRequired={isRequired}
      label="Select Resolution"
      width="size-2400" // Adjust the size as needed
      items={["19/8"]}
      defaultSelectedKey={selectedResolution}
      onSelectionChange={(key) => onResolutionChange(key as VideoResolution)}
    >
      {<Item key={VideoResolution["16/9"]}>{"16/9"}</Item>}
    </Picker>
  );
}
