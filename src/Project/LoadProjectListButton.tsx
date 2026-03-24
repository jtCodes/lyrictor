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
  ProgressCircle,
  View,
} from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import DesktopAppRequiredPopup from "../components/DesktopAppRequiredPopup";
import { isDesktopApp } from "../platform";
import DeleteProjectButton from "./DeleteProjectButton";
import ProjectList from "./ProjectList";
import { loadProjects, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { useAuthStore } from "../Auth/store";
import { signInWithGoogle } from "../Auth/signIn";
import {
  getCachedProjectSourceDetail,
  getProjectSourceLoadingMessage,
  getProjectSourcePluginForProject,
  hasCachedProjectSource,
  resolveProjectSource,
} from "./sourcePlugins";

export default function LoadProjectListButton({
  hideButton = false,
}: {
  hideButton?: boolean;
}) {
  const { acceptedFiles, getRootProps, getInputProps, open } = useDropzone();

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const setProjectActionMessage = useProjectStore(
    (state) => state.setProjectActionMessage
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const isLoadProjectPopupOpen = useProjectStore(
    (state) => state.isLoadProjectPopupOpen
  );
  const setIsLoadProjectPopupOpen = useProjectStore(
    (state) => state.setIsLoadProjectPopupOpen
  );
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setUnsavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const setImages = useProjectStore((state) => state.setImages);
  const markAsSaved = useProjectStore(
    (state) => state.markAsSaved
  );
  const setPromptLog = useAIImageGeneratorStore((state) => state.setPromptLog);
  const setGeneratedImageLog = useAIImageGeneratorStore(
    (state) => state.setGeneratedImageLog
  );
  const resetImageStore = useAIImageGeneratorStore((state) => state.reset);

  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);

  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [attemptToLoadFailed, setAttemptToLoadFailed] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const [isDesktopAppRequiredPopupOpen, setIsDesktopAppRequiredPopupOpen] =
    useState(false);
  const [shouldRestoreLoadProjectPopup, setShouldRestoreLoadProjectPopup] =
    useState(false);

  function canOpenProject(project?: Project) {
    if (!project) {
      return false;
    }

    const sourcePlugin = getProjectSourcePluginForProject(project.projectDetail);

    if (!isDesktopApp && sourcePlugin?.id === "youtube") {
      setShouldRestoreLoadProjectPopup(true);
      setIsLoadProjectPopupOpen(false);
      setIsPopupOpen(false);
      setIsDesktopAppRequiredPopupOpen(true);
      return false;
    }

    return true;
  }

  useEffect(() => {
    const fetchProjects = async () => {
      const projects = await loadProjects();
      setExistingProjects(projects);
      setIsLoading(false);
    };

    if (isLoadProjectPopupOpen && authReady) {
      setIsLoading(true);
      fetchProjects();
    }
  }, [isLoadProjectPopupOpen, authReady]);

  return (
    <>
      <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);
        setIsLoadProjectPopupOpen(isOpen);
        if (isOpen) {
          setIsLoading(true);
        }

        if (!isOpen) {
          if (!shouldRestoreLoadProjectPopup) {
            setSelectedProject(undefined);
            setAttemptToLoadFailed(false);
            acceptedFiles.pop();
          }
        }
      }}
      isOpen={isLoadProjectPopupOpen}
      >
        {!hideButton ? (
          <ActionButton
            onPress={async () => {
              const projects = await loadProjects();
              setExistingProjects(projects);
            }}
          >
            Load
          </ActionButton>
        ) : (
          <></>
        )}
        {(close) => (
          <Dialog UNSAFE_style={{ width: "min(960px, 92vw)" }}>
            <Heading>Load previous project</Heading>
            <Divider />
            <Content UNSAFE_style={{ overflow: "hidden" }}>
              <View>
              {!authUser && (
                <View marginBottom={12}>
                  <Button
                    variant="primary"
                    onPress={async () => {
                      try {
                        await signInWithGoogle();
                        setIsLoading(true);
                        const projects = await loadProjects();
                        setExistingProjects(projects);
                        setIsLoading(false);
                      } catch (_) {}
                    }}
                  >
                    Sign in with Google to load cloud projects
                  </Button>
                </View>
              )}
              <View>
                {isLoading ? (
                  <View paddingY="size-200">
                    <ProgressCircle aria-label="Loading projects" isIndeterminate size="M" />
                  </View>
                ) : (
                  <ProjectList
                    selectedProjectId={selectedProject?.id}
                    onSelectionChange={(project?: Project) => {
                      setSelectedProject(project);
                    }}
                  />
                )}
              </View>
              {selectedProject && selectedProject.projectDetail.isLocalUrl && !selectedProject.projectDetail.localAudioFilePath ? (
                <View marginTop={15}>
                  <div
                    {...getRootProps({ className: "dropzone" })}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      {...getInputProps()}
                      type={"file"}
                      accept="audio/*"
                    />{" "}
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
                      {acceptedFiles[0] ? (
                        <h4 style={{ marginTop: 5 }}>
                          <span style={{ fontWeight: 600 }}>Loaded: </span>
                          <span>{acceptedFiles[0]?.name}</span>
                        </h4>
                      ) : null}
                    </View>
                  </div>{" "}
                </View>
              ) : null}
              </View>
            </Content>
            <ButtonGroup>
            {selectedProject ? (
              <DeleteProjectButton
                project={selectedProject}
                onProjectDelete={async () => {
                  const projects = await loadProjects();
                  setExistingProjects(projects);
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
                onPress={async () => {
                  if (!canOpenProject(selectedProject)) {
                    return;
                  }

                  setIsLoadingProject(true);

                  try {
                    if (selectedProject) {
                      console.log(selectedProject);
                      // TODO: double check
                      resetImageStore();
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
                        try {
                          const sourcePlugin = getProjectSourcePluginForProject(projectDetail);
                          const hasCachedSource = hasCachedProjectSource(projectDetail);

                          if (hasCachedSource) {
                            projectDetail = getCachedProjectSourceDetail(projectDetail);
                          } else {
                            if (sourcePlugin) {
                              setProjectActionMessage(
                                getProjectSourceLoadingMessage(projectDetail)
                              );
                            }
                            projectDetail = await resolveProjectSource(projectDetail);
                          }
                        } catch (error) {
                          console.error("Failed to resolve YouTube audio:", error);
                          setAttemptToLoadFailed(true);
                          return;
                        }

                        setEditingProject(projectDetail);
                        setLyricTexts(selectedProject.lyricTexts);
                        setPromptLog(
                          selectedProject.promptLog !== undefined
                            ? selectedProject.promptLog
                            : []
                        );
                        const savedLog = selectedProject.generatedImageLog ?? [];
                        const savedUrls = new Set(savedLog.map((img) => img.url));
                        const timelineImages = selectedProject.lyricTexts
                          .filter((lt) => lt.isImage && lt.imageUrl && !savedUrls.has(lt.imageUrl))
                          .map((lt) => ({
                            url: lt.imageUrl!,
                            prompt: { prompt: "Added to timeline", model: "" } as const,
                          }));
                        setGeneratedImageLog([...savedLog, ...timelineImages]);

                        if (selectedProject.lyricReference) {
                          setLyricReference(selectedProject.lyricReference);
                          setUnsavedLyricReference(
                            selectedProject.lyricReference
                          );
                        } else {
                          setLyricReference("");
                          console.log("no lyricreference");
                        }

                        if (selectedProject.images) {
                          setImages(selectedProject.images);
                        } else {
                          setImages([]);
                        }

                        markAsSaved();
                        close();
                      } else {
                        setAttemptToLoadFailed(true);
                      }
                    } else {
                      setAttemptToLoadFailed(true);
                    }
                  } finally {
                    setProjectActionMessage(undefined);
                    setIsLoadingProject(false);
                  }
                }}
                isDisabled={isLoadingProject}
              >
                {isLoadingProject ? "Loading..." : "Load"}
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
      <DesktopAppRequiredPopup
        isOpen={isDesktopAppRequiredPopupOpen}
        onClose={() => {
          setIsDesktopAppRequiredPopupOpen(false);

          if (shouldRestoreLoadProjectPopup) {
            setShouldRestoreLoadProjectPopup(false);
            setIsPopupOpen(true);
            setIsLoadProjectPopupOpen(true);
          }
        }}
        title="This feature needs the desktop app"
        description="YouTube-backed projects need the Lyrictor desktop app so audio can be resolved locally. Download the dmg from the GitHub releases page to load these projects."
      />
    </>
  );
}
