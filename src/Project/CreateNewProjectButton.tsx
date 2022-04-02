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
import { useState } from "react";
import { ProjectDetail } from "./types";
import CreateNewProjectForm from "./CreateNewProjectForm";
import ProjectList from "./ProjectList";
import { useProjectStore } from "./store";

export default function CreateNewProjectButton() {
  const [creatingProject, setCreatingProject] = useState<ProjectDetail | undefined>();
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);
      }}
    >
      <ActionButton>New</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Create new project</Heading>
          <Divider />
          <Content>
            <CreateNewProjectForm
              creatingProject={creatingProject}
              setCreatingProject={setCreatingProject}
            />
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button
              variant="cta"
              onPress={() => {
                if (creatingProject && creatingProject.audioFileUrl) {
                  setEditingProject(creatingProject);
                  setLyricTexts([])
                  close();
                  setCreatingProject(undefined);
                } 
              }}
              autoFocus
            >
              Create
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
