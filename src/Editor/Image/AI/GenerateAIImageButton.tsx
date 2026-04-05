import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Flex,
  Header,
  Heading,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { useProjectStore } from "../../../Project/store";
import AIImageGenerator from "./AIImageGenerator";
import { useAIImageGeneratorStore } from "./store";
import ImageAutoMode from "@spectrum-icons/workflow/ImageAutoMode";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../../../theme";
import { ImageItem } from "../Imported/ImportImageButton";

export default function GenerateAIImageButton({
  position,
  mode = "timeline",
  label = "Generate",
  isFullWidth = false,
}: {
  position?: number;
  mode?: "timeline" | "library";
  label?: string;
  isFullWidth?: boolean;
}) {
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const addImages = useProjectStore((state) => state.addImages);
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );

  function handleConfirmClick(close: () => void) {
    if (selectedImageLogItem) {
      if (mode === "library") {
        const newImage: ImageItem = {
          id: `${Date.now()}-${selectedImageLogItem.url}`,
          url: selectedImageLogItem.url,
        };
        addImages([newImage]);
      } else {
        addNewLyricText(
          "",
          position ?? 0,
          true,
          selectedImageLogItem.url,
          false,
          undefined
        );
      }
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
      {mode === "library" ? (
        <Button variant="secondary" width={isFullWidth ? "100%" : undefined}>
          <Flex alignItems="center" justifyContent="center" gap="size-50">
            <ImageAutoMode />
            <Text>{label}</Text>
          </Flex>
        </Button>
      ) : (
        <ActionButton
          aria-label="Open AI image generator"
          isQuiet
          UNSAFE_className={HEADER_BUTTON_CLASS}
          UNSAFE_style={headerButtonStyle(false)}
        >
          <ImageAutoMode />
        </ActionButton>
      )}
      {(close) => (
        <Dialog>
          <Heading>{mode === "library" ? "Generate AI Image" : "Add Image"}</Heading>
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
              {mode === "library" ? "Save To Images" : "Add Selected Image"}
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
