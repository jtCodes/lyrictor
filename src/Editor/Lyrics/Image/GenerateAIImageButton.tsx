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
import AIImageGenerator from "./AIImageGenerator";

export default function GenerateAIImageButton() {
  return (
    <DialogTrigger>
      <ActionButton>Generate Image</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Internet Speed Test</Heading>
          <Header>Connection status: Connected</Header>
          <Divider />
          <Content>
            <AIImageGenerator />
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button variant="accent" onPress={close}>
              Confirm
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
