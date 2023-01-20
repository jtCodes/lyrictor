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
} from "@adobe/react-spectrum";
import { useEffect } from "react";
import { useProjectStore } from "../../../Project/store";
import AIImageGenerator from "./AIImageGenerator";
import PromptLogButton from "./PromptLogButton";
import { useAIImageGeneratorStore } from "./store";

export default function GenerateAIImageButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const currentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.currentGenFileUrl
  );
  
  function handleConfirmClick(close: () => void) {
    if (currentGenFileUrl) {
      addNewLyricText("", position, true, currentGenFileUrl);
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
    <DialogTrigger>
      <ActionButton>Generate Image</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Generate Image</Heading>
          <Header>
            <PromptLogButton />
          </Header>
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
            <Button variant="accent" onPress={() => handleConfirmClick(close)}>
              Confirm
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
