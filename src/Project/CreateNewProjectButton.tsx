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
import CreateNewProjectForm, { DataSource } from "./CreateNewProjectForm";
import { isProjectExist, saveProject, useProjectStore } from "./store";

enum CreateProjectOutcome {
  missingStreamUrl = "Missing stream url",
  missingLocalAudio = "Missing local audio file",
  missingName = "Missing project name",
  duplicate = "Project with same name already exists",
}

export default function CreateNewProjectButton() {
  const [creatingProject, setCreatingProject] =
    useState<ProjectDetail | undefined>();
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>(
    DataSource.local
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);

  const [attemptToCreateFailed, setAttemptToCreateFailed] =
    useState<boolean>(false);
  const [createProjectOutcome, setCreateProjectOutcome] =
    useState<CreateProjectOutcome>();

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
              selectedDataSource={selectedDataSource}
              setSelectedDataSource={(dataSource: DataSource) => {
                setSelectedDataSource(dataSource);
              }}
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
                    creatingProject.name &&
                    creatingProject.audioFileUrl &&
                    !isProjectExist(creatingProject)
                  ) {
                    saveProject({
                      id: creatingProject?.name,
                      projectDetail: creatingProject,
                      lyricTexts: [],
                      lyricReference: "",
                    });
                    setEditingProject(creatingProject);
                    setLyricTexts([]);
                    close();
                    setCreatingProject(undefined);
                  } else {
                    if (
                      creatingProject &&
                      creatingProject.audioFileUrl.length === 0
                    ) {
                      if (selectedDataSource === DataSource.local) {
                        setCreateProjectOutcome(
                          CreateProjectOutcome.missingLocalAudio
                        );
                      } else {
                        setCreateProjectOutcome(
                          CreateProjectOutcome.missingStreamUrl
                        );
                      }
                    } else if (
                      creatingProject &&
                      creatingProject.name.length !== 0 &&
                      isProjectExist(creatingProject)
                    ) {
                      setCreateProjectOutcome(CreateProjectOutcome.duplicate);
                    } else if (creatingProject && !creatingProject.name) {
                      setCreateProjectOutcome(CreateProjectOutcome.missingName);
                    }
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
                {createProjectOutcome}
              </AlertDialog>
            </DialogTrigger>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
