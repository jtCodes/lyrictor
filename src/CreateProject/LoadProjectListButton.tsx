import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
} from "@adobe/react-spectrum";
import ProjectList from "./ProjectList";

export default function LoadProjectListButton() {
  return (
    <DialogTrigger>
      <ActionButton>Load</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Load previous project</Heading>
          <Divider />
          <Content>
            <ProjectList />
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button variant="cta" onPress={close} autoFocus>
              Confirm
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
