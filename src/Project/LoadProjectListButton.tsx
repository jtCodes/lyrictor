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
import { useAIImageGeneratorStore } from "../Editor/Lyrics/Image/store";
import DeleteProjectButton from "./DeleteProjectButton";
import ProjectList from "./ProjectList";
import { loadProjects, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";

export default function LoadProjectListButton() {
  const { acceptedFiles, getRootProps, getInputProps, open } = useDropzone();

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setUnsavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const setPromptLog = useAIImageGeneratorStore((state) => state.setPromptLog);
  const setGeneratedImageLog = useAIImageGeneratorStore(
    (state) => state.setGeneratedImageLog
  );

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
      <ActionButton
        onPress={() => {
          setExistingProjects(loadProjects());
        }}
      >
        Load
      </ActionButton>
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
                  if (selectedProject) {
                    let projectDetail: ProjectDetail | undefined;

                    if (
                      selectedProject.projectDetail.isLocalUrl &&
                      acceptedFiles[0]?.name ===
                        selectedProject.projectDetail.audioFileName
                    ) {
                      projectDetail = {
                        ...selectedProject.projectDetail,
                        audioFileUrl: URL.createObjectURL(acceptedFiles[0]),
                      };
                    } else if (!selectedProject.projectDetail.isLocalUrl) {
                      projectDetail = {
                        ...selectedProject.projectDetail,
                      };
                    }

                    if (projectDetail) {
                      setEditingProject(projectDetail);
                      setLyricTexts(selectedProject.lyricTexts);
                      setPromptLog(
                        selectedProject.promptLog !== undefined
                          ? selectedProject.promptLog
                          : []
                      );
                      setGeneratedImageLog(
                        selectedProject.generatedImageLog !== undefined
                          ? selectedProject.generatedImageLog
                          : []
                      );

                      if (selectedProject.lyricReference) {
                        setLyricReference(selectedProject.lyricReference);
                        setUnsavedLyricReference(
                          selectedProject.lyricReference
                        );
                      } else {
                        setLyricReference("");
                      }
                      close();
                    } else {
                      setAttemptToLoadFailed(true);
                    }
                  } else {
                    setAttemptToLoadFailed(true);
                  }
                }}
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
