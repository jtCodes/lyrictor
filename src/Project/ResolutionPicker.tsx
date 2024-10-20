import { Picker, Item } from "@adobe/react-spectrum";
import { VideoAspectRatio } from "./types";

interface ResolutionPickerProps {
  isRequired?: boolean;
  selectedResolution?: VideoAspectRatio;
  onResolutionChange: (resolution: VideoAspectRatio) => void;
}

export default function ResolutionPicker({
  isRequired = true,
  selectedResolution,
  onResolutionChange,
}: ResolutionPickerProps) {
  return (
    <Picker
      isRequired={isRequired}
      label="Select Aspect Ratio"
      width="size-2400" // Adjust the size as needed
      items={["19/8"]}
      defaultSelectedKey={selectedResolution}
      onSelectionChange={(key) => onResolutionChange(key as VideoAspectRatio)}
    >
      {<Item key={VideoAspectRatio["16/9"]}>{"16/9"}</Item>}
    </Picker>
  );
}
