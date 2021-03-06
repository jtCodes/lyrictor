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
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import DeleteProjectButton from "./DeleteProjectButton";
import ProjectList from "./ProjectList";
import { loadProjects, useProjectStore } from "./store";
import { Project } from "./types";

export default function LoadProjectListButton() {
  const { acceptedFiles, getRootProps, getInputProps, open } = useDropzone();
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);

  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [attemptToLoadFailed, setAttemptToLoadFailed] =
    useState<boolean>(false);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);

  useEffect(() => {
    setExistingProjects(loadProjects());
  }, []);

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);

        if (!isOpen) {
          setSelectedProject(undefined);
          setAttemptToLoadFailed(false);
          acceptedFiles.pop();
        } else {
          setExistingProjects(loadProjects());
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
                  existingProjects={existingProjects}
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
                  <input {...getInputProps()} type={"file"} accept="audio/*" />{" "}
                  <View
                    backgroundColor={"gray-200"}
                    padding={5}
                    borderRadius={"regular"}
                  >
                    {selectedProject &&
                    selectedProject.projectDetail.isLocalUrl ? (
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
            {selectedProject ? (
              <DeleteProjectButton
                project={selectedProject}
                onProjectDelete={() => {
                  setExistingProjects(loadProjects());
                  setSelectedProject(undefined);
                }}
              />
            ) : null}
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <DialogTrigger isOpen={attemptToLoadFailed}>
              <Button
                variant="cta"
                onPress={() => {
                  if (
                    selectedProject &&
                    selectedProject.projectDetail.isLocalUrl &&
                    acceptedFiles[0]?.name ===
                      selectedProject.projectDetail.audioFileName
                  ) {
                    setEditingProject({
                      ...selectedProject.projectDetail,
                      audioFileUrl: URL.createObjectURL(acceptedFiles[0]),
                    });
                    setLyricTexts(selectedProject.lyricTexts);
                    if (selectedProject.lyricReference) {
                      setLyricReference(selectedProject.lyricReference);
                    } else {
                      setLyricReference("");
                    }
                    close();
                  } else if (
                    selectedProject &&
                    !selectedProject.projectDetail.isLocalUrl
                  ) {
                    setEditingProject({
                      ...selectedProject.projectDetail,
                    });
                    setLyricTexts(selectedProject.lyricTexts);
                    if (selectedProject.lyricReference) {
                      setLyricReference(selectedProject.lyricReference);
                    } else {
                      setLyricReference("");
                    }
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
