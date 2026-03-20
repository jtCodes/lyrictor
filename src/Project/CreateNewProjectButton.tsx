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
  Radio,
  RadioGroup,
  Text,
  View,
} from "@adobe/react-spectrum";
import { useState } from "react";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import CreateNewProjectForm, { DataSource } from "./CreateNewProjectForm";
import { isProjectExist, loadProjects, useProjectStore } from "./store";
import { ProjectDetail } from "./types";
import { useProjectService } from "./useProjectService";
import { isValidUrl } from "./utils";
import { useAudioPlayer } from "react-use-audio-player";
import {
  AppleMusicAlbumTrack,
  parseAppleMusicAlbumUrl,
  parseAppleMusicSongUrl,
  resolveAppleMusicAlbumTracks,
  resolveAppleMusicSongTrack,
} from "./appleMusic";
import { ToastQueue } from "@react-spectrum/toast";

enum CreateProjectOutcome {
  missingStreamUrl = "Missing stream url",
  invalidStreamUrl = "Please enter a valid URL",
  missingLocalAudio = "Missing local audio file",
  missingName = "Missing project name",
  duplicate = "Project with same name already exists",
}

export default function CreateNewProjectButton({
  hideButton = false,
  isEdit = false,
}: {
  hideButton?: boolean;
  isEdit?: boolean;
}) {
  const [saveProject] = useProjectService();
  const { pause } = useAudioPlayer();
  const [creatingProject, setCreatingProject] = useState<
    ProjectDetail | undefined
  >();
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>(
    DataSource.local
  );

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setUnSavedLyricReference = useProjectStore(
    (state) => state.setUnsavedLyricReference
  );
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const markAsSaved = useProjectStore(
    (state) => state.markAsSaved
  );

  const setPromptLog = useAIImageGeneratorStore((state) => state.setPromptLog);
  const setGeneratedImageLog = useAIImageGeneratorStore(
    (state) => state.setGeneratedImageLog
  );

  const isCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.isCreateNewProjectPopupOpen
  );
  const isEditProjectPopupOpen = useProjectStore(
    (state) => state.isEditProjectPopupOpen
  );

  const [attemptToCreateFailed, setAttemptToCreateFailed] =
    useState<boolean>(false);
  const [createProjectOutcome, setCreateProjectOutcome] =
    useState<CreateProjectOutcome>();
  const [audioUrlValid, setAudioUrlValid] = useState<boolean | null>(null);
  const [appleMusicPickerOpen, setAppleMusicPickerOpen] = useState(false);
  const [isResolvingAppleMusic, setIsResolvingAppleMusic] = useState(false);
  const [appleMusicTracks, setAppleMusicTracks] = useState<AppleMusicAlbumTrack[]>([]);
  const [selectedAppleMusicTrackId, setSelectedAppleMusicTrackId] = useState<string | undefined>();
  const [appleMusicAlbumName, setAppleMusicAlbumName] = useState("");
  const [appleMusicArtistName, setAppleMusicArtistName] = useState("");

  function applyAppleMusicTrack(track: AppleMusicAlbumTrack, albumUrl: string) {
    if (!creatingProject) return;

    setAudioUrlValid(true);
    setCreatingProject({
      ...creatingProject,
      audioFileName: track.trackName,
      audioFileUrl: track.previewUrl,
      appleMusicAlbumUrl: albumUrl,
      appleMusicTrackId: track.trackId,
      appleMusicTrackName: track.trackName,
      albumArtSrc: creatingProject.albumArtSrc || track.artworkUrl100,
      isLocalUrl: false,
      updatedDate: new Date(),
    });
  }

  async function openAppleMusicTrackPicker(albumUrl: string) {
    setIsResolvingAppleMusic(true);
    try {
      const result = await resolveAppleMusicAlbumTracks(albumUrl);
      if (!result || result.tracks.length === 0) {
        ToastQueue.negative("No previewable Apple Music tracks found", {
          timeout: 4000,
        });
        return false;
      }

      setAppleMusicTracks(result.tracks);
      setAppleMusicAlbumName(result.albumName);
      setAppleMusicArtistName(result.artistName);
      setSelectedAppleMusicTrackId(
        creatingProject?.appleMusicTrackId ?? result.tracks[0].trackId
      );
      setAppleMusicPickerOpen(true);
      return true;
    } catch (error) {
      console.error("Failed to resolve Apple Music album:", error);
      ToastQueue.negative("Failed to load Apple Music album tracks", {
        timeout: 4000,
      });
      return false;
    } finally {
      setIsResolvingAppleMusic(false);
    }
  }

  async function handleStreamUrlBlur(value: string) {
    const parsedSong = parseAppleMusicSongUrl(value);
    if (parsedSong) {
      setIsResolvingAppleMusic(true);
      try {
        const track = await resolveAppleMusicSongTrack(parsedSong.originalUrl);
        if (!track) {
          ToastQueue.negative("No previewable Apple Music track found", {
            timeout: 4000,
          });
          return;
        }

        applyAppleMusicTrack(track, parsedSong.originalUrl);
        return;
      } catch (error) {
        console.error("Failed to resolve Apple Music song:", error);
        ToastQueue.negative("Failed to load Apple Music song", {
          timeout: 4000,
        });
        return;
      } finally {
        setIsResolvingAppleMusic(false);
      }
    }

    const parsedAlbum = parseAppleMusicAlbumUrl(value);
    if (!parsedAlbum) {
      return;
    }

    await openAppleMusicTrackPicker(parsedAlbum.originalUrl);
  }

  async function handleRepickAppleTrack() {
    if (!creatingProject?.appleMusicAlbumUrl) {
      return;
    }

    await openAppleMusicTrackPicker(creatingProject.appleMusicAlbumUrl);
  }

  function onCreatePressed(close: () => void) {
    return async () => {
      if (
        selectedDataSource === DataSource.stream &&
        creatingProject?.audioFileUrl &&
        (
          parseAppleMusicAlbumUrl(creatingProject.audioFileUrl) ||
          parseAppleMusicSongUrl(creatingProject.audioFileUrl)
        )
      ) {
        await handleStreamUrlBlur(creatingProject.audioFileUrl);
        return;
      }

      if (
        selectedDataSource === DataSource.stream &&
        creatingProject?.audioFileUrl
      ) {
        const valid = isValidUrl(creatingProject.audioFileUrl);
        setAudioUrlValid(valid);
        if (!valid) {
          setCreateProjectOutcome(CreateProjectOutcome.invalidStreamUrl);
          setAttemptToCreateFailed(true);
          return;
        }
      }

      if (
        creatingProject &&
        creatingProject.name &&
        creatingProject.audioFileUrl &&
        !(await isProjectExist(creatingProject))
      ) {
        await saveProject({
          id: creatingProject?.name,
          projectDetail: creatingProject,
          lyricTexts: [],
          lyricReference: "",
          generatedImageLog: [],
          promptLog: [],
          images: [],
        });

        const projects = await loadProjects();
        setExistingProjects(projects);

        setEditingProject(creatingProject);
        setLyricTexts([]);
        setUnSavedLyricReference("");
        setLyricReference("");
        setPromptLog([]);
        setGeneratedImageLog([]);

        markAsSaved();
        close();
        setCreatingProject(undefined);
      } else {
        if (creatingProject && creatingProject.audioFileUrl.length === 0) {
          if (selectedDataSource === DataSource.local) {
            setCreateProjectOutcome(CreateProjectOutcome.missingLocalAudio);
          } else {
            setCreateProjectOutcome(CreateProjectOutcome.missingStreamUrl);
          }
        } else if (
          creatingProject &&
          creatingProject.name.length !== 0 &&
          (await isProjectExist(creatingProject))
        ) {
          setCreateProjectOutcome(CreateProjectOutcome.duplicate);
        } else if (creatingProject && !creatingProject.name) {
          setCreateProjectOutcome(CreateProjectOutcome.missingName);
        }
        setAttemptToCreateFailed(true);
      }
    };
  }

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        setIsPopupOpen(isOpen);
        setCreateNewProjectPopupOpen(isOpen);

        if (isOpen) {
          pause();
        }

        if (!isOpen) {
          setCreatingProject(undefined);
          setAttemptToCreateFailed(false);
          setAppleMusicPickerOpen(false);
          setAppleMusicTracks([]);
          setSelectedAppleMusicTrackId(undefined);
        }
      }}
      isOpen={isCreateNewProjectPopupOpen || isEditProjectPopupOpen}
    >
      {!hideButton ? <ActionButton>New</ActionButton> : <></>}
      {(close) => (
        <Dialog>
          <Heading>{isEdit ? "Edit project" : "Create new project"}</Heading>
          <Divider />
          <Content>
            <CreateNewProjectForm
              selectedDataSource={selectedDataSource}
              setSelectedDataSource={(dataSource: DataSource) => {
                setSelectedDataSource(dataSource);
              }}
              creatingProject={creatingProject}
              setCreatingProject={setCreatingProject}
              audioUrlValid={audioUrlValid}
              onStreamUrlBlur={handleStreamUrlBlur}
              onRepickAppleTrack={handleRepickAppleTrack}
              isResolvingAppleMusic={isResolvingAppleMusic}
            />
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <DialogTrigger isOpen={attemptToCreateFailed}>
              <Button variant="cta" onPress={onCreatePressed(close)}>
                {isEdit ? "Save Edit" : "Create"}
              </Button>
              <AlertDialog
                variant="error"
                title={`Failed to ${isEdit ? "save" : "create"}`}
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
          <DialogTrigger
            isOpen={appleMusicPickerOpen}
            onOpenChange={setAppleMusicPickerOpen}
          >
            <span />
            <Dialog>
              <Heading>Select Apple Music Track</Heading>
              <Divider />
              <Content>
                <View marginBottom="size-200">
                  <Text>
                    {appleMusicAlbumName}
                    {appleMusicArtistName ? ` by ${appleMusicArtistName}` : ""}
                  </Text>
                </View>
                <RadioGroup
                  label="Album tracks"
                  value={selectedAppleMusicTrackId}
                  onChange={(value) => setSelectedAppleMusicTrackId(value)}
                >
                  {appleMusicTracks.map((track) => (
                    <Radio key={track.trackId} value={track.trackId}>
                      {track.trackNumber ? `${track.trackNumber}. ` : ""}
                      {track.trackName}
                    </Radio>
                  ))}
                </RadioGroup>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={() => setAppleMusicPickerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="cta"
                  onPress={() => {
                    const selectedTrack = appleMusicTracks.find(
                      (track) => track.trackId === selectedAppleMusicTrackId
                    );
                    if (!selectedTrack || !creatingProject?.audioFileUrl) {
                      return;
                    }

                    const albumUrl =
                      creatingProject.appleMusicAlbumUrl ?? creatingProject.audioFileUrl;
                    applyAppleMusicTrack(selectedTrack, albumUrl);
                    setAppleMusicPickerOpen(false);
                  }}
                >
                  Use Track
                </Button>
              </ButtonGroup>
            </Dialog>
          </DialogTrigger>
        </Dialog>
      )}
    </DialogTrigger>
  );
}
