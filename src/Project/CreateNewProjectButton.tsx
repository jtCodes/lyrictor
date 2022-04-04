import {
  ActionButton,
  AlertDialog,
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
import { isProjectExist, saveProject, useProjectStore } from "./store";

export default function CreateNewProjectButton() {
  const [creatingProject, setCreatingProject] =
    useState<ProjectDetail | undefined>();
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);

  const [attemptToCreateFailed, setAttemptToCreateFailed] =
    useState<boolean>(false);

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);

        if (!isOpen) {
          setLyricTexts([]);
          setCreatingProject(undefined);
          setAttemptToCreateFailed(false);
        }
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
            <DialogTrigger isOpen={attemptToCreateFailed}>
              <Button
                variant="cta"
                onPress={() => {
                  if (
                    creatingProject &&
                    creatingProject.audioFileUrl &&
                    !isProjectExist(creatingProject)
                  ) {
                    saveProject({
                      id: creatingProject?.name,
                      projectDetail: creatingProject,
                      lyricTexts: [],
                      lyricReference: ""
                    });
                    setEditingProject(creatingProject);
                    setLyricTexts([]);
                    close();
                    setCreatingProject(undefined);
                  } else {
                    setAttemptToCreateFailed(true);
                  }
                }}
                autoFocus
              >
                Create
              </Button>
              <AlertDialog
                variant="error"
                title="Failed to create"
                primaryActionLabel="Close"
                onCancel={() => {
                  setAttemptToCreateFailed(false);
                }}
                onPrimaryAction={() => {
                  setAttemptToCreateFailed(false);
                }}
              >
                Project with the name already exist. Try loading it instead or
                change to another name.
              </AlertDialog>
            </DialogTrigger>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
