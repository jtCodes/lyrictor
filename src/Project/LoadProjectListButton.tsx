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
import DeleteProjectButton from "./DeleteProjectButton";
import ProjectList from "./ProjectList";
import { resolveEditingProjectAccess, loadProjects, useProjectStore } from "./store";
import { Project, ProjectDetail } from "./types";
import { useAuthStore } from "../Auth/store";
import { signInWithGoogle } from "../Auth/signIn";
import {
  getProjectSourceLoadingMessage,
  getProjectSourcePluginForProject,
  resolveProjectSource,
} from "./sourcePlugins";
import {
  applyPickedLocalAudioToProjectDetail,
  doesPickedLocalAudioMatchProject,
  hasAbsoluteLocalAudioPath,
  projectNeedsLocalAudioRepick,
} from "./sourcePlugins/localFilePlugin";
import { useProjectOpenGuard } from "./useProjectOpenGuard";
import { loadProjectIntoEditor } from "./loadProjectIntoEditor";

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
  const resetImageStore = useAIImageGeneratorStore((state) => state.reset);

  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);

  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [attemptToLoadFailed, setAttemptToLoadFailed] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const [shouldRestoreLoadProjectPopup, setShouldRestoreLoadProjectPopup] =
    useState(false);
  const { canOpenProject: canOpenProjectWithGuard, desktopAppRequiredPopup } =
    useProjectOpenGuard({
      desktopAppRequiredDescription:
        "YouTube-backed projects need the Lyrictor desktop app so audio can be resolved locally. Download the dmg from the GitHub releases page to load these projects.",
      onDesktopAppRequiredPopupClose: () => {
        if (shouldRestoreLoadProjectPopup) {
          setShouldRestoreLoadProjectPopup(false);
          setIsPopupOpen(true);
          setIsLoadProjectPopupOpen(true);
        }
      },
    });

  function canOpenProject(project?: Project) {
    if (!project) {
      return false;
    }

    if (
      projectNeedsLocalAudioRepick(project.projectDetail) &&
      !doesPickedLocalAudioMatchProject(acceptedFiles[0], project.projectDetail)
    ) {
      return false;
    }

    return canOpenProjectWithGuard(project.projectDetail, () => {
      setShouldRestoreLoadProjectPopup(true);
      setIsLoadProjectPopupOpen(false);
      setIsPopupOpen(false);
    });
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
                  <div
                    style={{
                      minHeight: 360,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ProgressCircle aria-label="Loading projects" isIndeterminate size="M" />
                  </div>
                ) : (
                  <ProjectList
                    selectedProjectId={selectedProject?.id}
                    onSelectionChange={(project?: Project) => {
                      setSelectedProject(project);
                    }}
                  />
                )}
              </View>
              {selectedProject &&
              projectNeedsLocalAudioRepick(selectedProject.projectDetail) ? (
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
                        doesPickedLocalAudioMatchProject(
                          acceptedFiles[0],
                          selectedProject.projectDetail
                        )
                      ) {
                        projectDetail = applyPickedLocalAudioToProjectDetail(
                          selectedProject.projectDetail,
                          acceptedFiles[0] as File & { path?: string }
                        );
                      } else if (
                        selectedProject.projectDetail.isLocalUrl &&
                        hasAbsoluteLocalAudioPath(selectedProject.projectDetail.localAudioFilePath)
                      ) {
                        projectDetail = {
                          ...selectedProject.projectDetail,
                        };
                      } else if (!selectedProject.projectDetail.isLocalUrl) {
                        projectDetail = {
                          ...selectedProject.projectDetail,
                        };
                      }

                      if (projectDetail) {
                        try {
                          const sourcePlugin = getProjectSourcePluginForProject(projectDetail);
                          if (sourcePlugin) {
                            setProjectActionMessage(
                              getProjectSourceLoadingMessage(projectDetail)
                            );
                          }
                          projectDetail = await resolveProjectSource(projectDetail);
                        } catch (error) {
                          console.error("Failed to resolve YouTube audio:", error);
                          setAttemptToLoadFailed(true);
                          return;
                        }

                        await loadProjectIntoEditor(selectedProject, {
                          projectDetail,
                          syncUnsavedLyricReference: true,
                        });
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
      {desktopAppRequiredPopup}
    </>
  );
}
