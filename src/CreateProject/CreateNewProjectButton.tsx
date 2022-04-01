import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
  Text,
} from "@adobe/react-spectrum";
import CreateNewProjectForm from "./CreateNewProject";
import ProjectList from "./ProjectList";

export default function CreateNewProjectButton() {
  return (
    <DialogTrigger>
      <ActionButton>New</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Create new project</Heading>
          <Divider />
          <Content>
            <CreateNewProjectForm />
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
