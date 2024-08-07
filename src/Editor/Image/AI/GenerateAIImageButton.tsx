import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Header,
  Heading,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import AIImageGenerator from "./AIImageGenerator";
import PromptLogButton from "./PromptLogButton";
import { useAIImageGeneratorStore } from "./store";
import ImageAutoMode from "@spectrum-icons/workflow/ImageAutoMode";

export default function GenerateAIImageButton({
  position,
}: {
  position: number;
}) {
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );

  function handleConfirmClick(close: () => void) {
    if (selectedImageLogItem) {
      addNewLyricText(
        "",
        position,
        true,
        selectedImageLogItem.url,
        false,
        undefined
      );
    }
    onDiaglogClosed(close);
  }

  function handleCancelClick(close: () => void) {
    onDiaglogClosed(close);
  }

  function onDiaglogClosed(close: () => void) {
    close();
  }

  return (
    <DialogTrigger
      type="fullscreen"
      onOpenChange={(isOpen: boolean) => {
        setIsPopupOpen(isOpen);
      }}
    >
      <ActionButton isQuiet>
        <ImageAutoMode />
      </ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Add Image</Heading>
          <Divider />
          <Content>
            <AIImageGenerator />
          </Content>
          <ButtonGroup>
            <Button
              variant="secondary"
              onPress={() => handleCancelClick(close)}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              isDisabled={selectedImageLogItem === undefined}
              onPress={() => handleConfirmClick(close)}
            >
              Add Selected Image
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
