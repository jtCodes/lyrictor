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
  View,
} from "@adobe/react-spectrum";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import ProjectList from "./ProjectList";
import { useProjectStore } from "./store";
import { Project } from "./types";

export default function LoadProjectListButton() {
  const { acceptedFiles, getRootProps, getInputProps, open } = useDropzone();
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [attemptToLoadFailed, setAttemptToLoadFailed] =
    useState<boolean>(false);

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);

        if (!isOpen) {
          setSelectedProject(undefined);
          setAttemptToLoadFailed(false);
          acceptedFiles.pop();
        }
      }}
    >
      <ActionButton>Load</ActionButton>
      {(close) => (
        <Dialog>
          <Heading>Load previous project</Heading>
          <Divider />
          <Content height={"size-4600"}>
            <View height={"size-3000"}>
              <View height={"size-2400"} overflow={"auto"}>
                <ProjectList
                  onSelectionChange={(project?: Project) => {
                    setSelectedProject(project);
                  }}
                />
              </View>{" "}
              <View marginTop={10}>
                <div
                  {...getRootProps({ className: "dropzone" })}
                  style={{ cursor: "pointer" }}
                >
                  <input
                    {...getInputProps()}
                    type={"file"}
                    accept="audio/mp3,audio/*;capture=microphone"
                  />{" "}
                  <View
                    backgroundColor={"gray-200"}
                    padding={5}
                    borderRadius={"regular"}
                  >
                    {selectedProject ? (
                      <p>
                        Drag 'n' drop{" "}
                        <span style={{ fontWeight: "bold" }}>
                          {selectedProject.projectDetail.audioFileName}
                        </span>
                        , or click to select it
                      </p>
                    ) : null}
                    <h4>{acceptedFiles[0]?.name}</h4>
                  </View>
                </div>{" "}
              </View>
            </View>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <DialogTrigger isOpen={attemptToLoadFailed}>
              <Button
                variant="cta"
                onPress={() => {
                  if (
                    acceptedFiles[0]?.name ===
                    selectedProject?.projectDetail.audioFileName
                  ) {
                    setEditingProject({
                      ...selectedProject.projectDetail,
                      audioFileUrl: URL.createObjectURL(acceptedFiles[0]),
                    });
                    setLyricTexts(selectedProject.lyricTexts);
                    close();
                  } else {
                    setAttemptToLoadFailed(true);
                  }
                }}
                autoFocus
              >
                Load
              </Button>
              <AlertDialog
                variant="error"
                title="Failed to load"
                primaryActionLabel="Close"
                onCancel={() => {
                  setAttemptToLoadFailed(false);
                }}
                onPrimaryAction={() => {
                  setAttemptToLoadFailed(false);
                }}
              >
                Make sure you load the exact audio file that was used to create
                this project.
              </AlertDialog>
            </DialogTrigger>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
