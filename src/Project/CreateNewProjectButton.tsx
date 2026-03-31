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
import { useEffect, useMemo, useRef, useState } from "react";
import { useAIImageGeneratorStore } from "../Editor/Image/AI/store";
import CreateNewProjectForm, { DataSource } from "./CreateNewProjectForm";
import { isProjectExist, loadProjects, useProjectStore } from "./store";
import { EditingMode, ProjectDetail, VideoAspectRatio } from "./types";
import { useProjectService } from "./useProjectService";
import { isValidUrl } from "./utils";
import { useAudioPlayer } from "react-use-audio-player";
import {
  AppleMusicAlbumTrack,
  AppleMusicTopSong,
  fetchTopAppleMusicSongs,
  parseAppleMusicAlbumUrl,
  parseAppleMusicSongUrl,
  pickDiverseTopSongs,
  resolveAppleMusicAlbumTracks,
  resolveAppleMusicSongTrack,
  resolveAppleMusicSongTrackById,
} from "./appleMusic";
import { ToastQueue } from "@react-spectrum/toast";
import {
  getProjectSourcePluginForProject,
  getProjectSourcePluginForUrl,
  getProjectSourceResolveMessages,
  getProjectSourceUrl,
  resolveProjectSource,
} from "./sourcePlugins";

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
  const isProjectDialogOpen = isCreateNewProjectPopupOpen || isEditProjectPopupOpen;

  const [attemptToCreateFailed, setAttemptToCreateFailed] =
    useState<boolean>(false);
  const [createProjectOutcome, setCreateProjectOutcome] =
    useState<CreateProjectOutcome>();
  const [audioUrlValid, setAudioUrlValid] = useState<boolean | null>(null);
  const [appleMusicPickerOpen, setAppleMusicPickerOpen] = useState(false);
  const [isResolvingAppleMusic, setIsResolvingAppleMusic] = useState(false);
  const [youtubeStatusMessage, setYoutubeStatusMessage] = useState<string>();
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [appleMusicTracks, setAppleMusicTracks] = useState<AppleMusicAlbumTrack[]>([]);
  const [selectedAppleMusicTrackId, setSelectedAppleMusicTrackId] = useState<string | undefined>();
  const [appleMusicAlbumName, setAppleMusicAlbumName] = useState("");
  const [appleMusicArtistName, setAppleMusicArtistName] = useState("");
  const [topAppleSongs, setTopAppleSongs] = useState<AppleMusicTopSong[]>([]);
  const [isLoadingTopAppleSongs, setIsLoadingTopAppleSongs] = useState(false);
  const [topAppleSongPreviewById, setTopAppleSongPreviewById] = useState<Record<string, AppleMusicAlbumTrack>>({});
  const [previewingTopAppleSongId, setPreviewingTopAppleSongId] = useState<string>();
  const [loadingTopAppleSongPreviewId, setLoadingTopAppleSongPreviewId] = useState<string>();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const suggestedTopAppleSongs = useMemo(() => topAppleSongs.slice(0, 5), [topAppleSongs]);

  async function waitForPaint() {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  function stopTopAppleSongPreview() {
    if (!previewAudioRef.current) {
      setPreviewingTopAppleSongId(undefined);
      return;
    }

    previewAudioRef.current.pause();
    previewAudioRef.current.currentTime = 0;
    setPreviewingTopAppleSongId(undefined);
  }

  function applyAppleMusicTrack(track: AppleMusicAlbumTrack, albumUrl: string) {
    if (!creatingProject) return;

    setAudioUrlValid(true);
    setCreatingProject({
      ...creatingProject,
      name: creatingProject.name || `${track.artistName} - ${track.trackName}`,
      artistName: creatingProject.artistName || track.artistName,
      songName: track.trackName,
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

  async function loadTopAppleSongs() {
    if (isEdit || isLoadingTopAppleSongs || topAppleSongs.length > 0) {
      return;
    }

    setIsLoadingTopAppleSongs(true);

    try {
      const songs = await fetchTopAppleMusicSongs("us", 100);
      const newestSongs = [...songs].sort((leftSong, rightSong) => {
        const leftDate = leftSong.releaseDate ? Date.parse(leftSong.releaseDate) : 0;
        const rightDate = rightSong.releaseDate ? Date.parse(rightSong.releaseDate) : 0;
        return rightDate - leftDate;
      });

      setTopAppleSongs(pickDiverseTopSongs(newestSongs, 5));
    } catch (error) {
      console.error("Failed to load top Apple songs:", error);
    } finally {
      setIsLoadingTopAppleSongs(false);
    }
  }

  useEffect(() => {
    if (!isProjectDialogOpen || isEdit) {
      return;
    }

    void loadTopAppleSongs();
  }, [isEdit, isProjectDialogOpen]);

  useEffect(() => {
    const previewAudio = previewAudioRef.current;

    return () => {
      if (!previewAudio) {
        return;
      }

      previewAudio.pause();
      previewAudio.removeAttribute("src");
      previewAudio.load();
    };
  }, []);

  async function handleTopAppleSongPreview(song: AppleMusicTopSong) {
    if (loadingTopAppleSongPreviewId === song.id) {
      return;
    }

    if (previewingTopAppleSongId === song.id) {
      stopTopAppleSongPreview();
      return;
    }

    setLoadingTopAppleSongPreviewId(song.id);

    try {
      let track = topAppleSongPreviewById[song.id];

      if (!track) {
        const resolvedTrack = await resolveAppleMusicSongTrackById(song.id, song.country);

        if (!resolvedTrack) {
          ToastQueue.negative("No preview available for this song", {
            timeout: 4000,
          });
          return;
        }

        track = resolvedTrack;
        setTopAppleSongPreviewById((currentValue) => ({
          ...currentValue,
          [song.id]: resolvedTrack,
        }));
      }

      pause();

      let previewAudio = previewAudioRef.current;

      if (!previewAudio) {
        previewAudio = new Audio();
        previewAudio.preload = "auto";
        previewAudio.addEventListener("ended", () => {
          setPreviewingTopAppleSongId(undefined);
        });
        previewAudioRef.current = previewAudio;
      }

      previewAudio.pause();
      previewAudio.src = track.previewUrl;
      previewAudio.currentTime = 0;
      await previewAudio.play();
      setPreviewingTopAppleSongId(song.id);
    } catch (error) {
      console.error("Failed to preview top Apple song:", error);
      ToastQueue.negative("Failed to play preview", {
        timeout: 4000,
      });
      setPreviewingTopAppleSongId(undefined);
    } finally {
      setLoadingTopAppleSongPreviewId(undefined);
    }
  }

  async function handleTopAppleSongSelect(song: AppleMusicTopSong) {
    setSelectedDataSource(DataSource.stream);
    setIsResolvingAppleMusic(true);

    try {
      const track = await resolveAppleMusicSongTrackById(song.id, song.country);

      if (!track) {
        ToastQueue.negative("No previewable Apple Music track found", {
          timeout: 4000,
        });
        return;
      }

      setCreatingProject((currentProject) => {
        const now = new Date();

        if (!currentProject) {
          return {
            name: `${track.artistName} - ${track.trackName}`,
            artistName: track.artistName,
            songName: track.trackName,
            createdDate: now,
            updatedDate: now,
            audioFileName: track.trackName,
            audioFileUrl: track.previewUrl,
            appleMusicTrackId: track.trackId,
            appleMusicTrackName: track.trackName,
            albumArtSrc: track.artworkUrl100,
            appleMusicAlbumUrl: song.url,
            isLocalUrl: false,
            resolution: VideoAspectRatio["16/9"],
            editingMode: EditingMode.free,
          };
        }

        return {
          ...currentProject,
          name: currentProject.name || `${track.artistName} - ${track.trackName}`,
          artistName: currentProject.artistName || track.artistName,
          songName: track.trackName,
          audioFileName: track.trackName,
          audioFileUrl: track.previewUrl,
          appleMusicAlbumUrl: song.url,
          appleMusicTrackId: track.trackId,
          appleMusicTrackName: track.trackName,
          albumArtSrc: currentProject.albumArtSrc || track.artworkUrl100,
          isLocalUrl: false,
          updatedDate: now,
        };
      });

      setAudioUrlValid(true);
      stopTopAppleSongPreview();
    } catch (error) {
      console.error("Failed to load top Apple song:", error);
      ToastQueue.negative("Failed to load preview for this song", {
        timeout: 4000,
      });
    } finally {
      setIsResolvingAppleMusic(false);
    }
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
      const sourcePlugin = getProjectSourcePluginForUrl(value);

      if (!sourcePlugin || !creatingProject) {
        return;
      }

      try {
        const resolveMessages = getProjectSourceResolveMessages(value);

        if (resolveMessages?.checkingMessage) {
          setYoutubeStatusMessage(resolveMessages.checkingMessage);
          await waitForPaint();
        }

        setYoutubeStatusMessage(resolveMessages?.resolvingMessage ?? "Preparing source...");
        await waitForPaint();
        const resolvedProject = await resolveProjectSource({
          ...creatingProject,
          audioFileName: creatingProject.audioFileName || value,
          audioFileUrl: value,
          isLocalUrl: false,
          name: creatingProject.name || "",
        });

        setAudioUrlValid(true);
        setCreatingProject(resolvedProject);
      } catch (error) {
        console.error("Failed to resolve YouTube audio:", error);
        setAudioUrlValid(false);
        ToastQueue.negative(
          error instanceof Error
            ? `Failed to load YouTube audio: ${error.message}`
            : "Failed to load YouTube audio",
          {
          timeout: 4000,
          }
        );
      } finally {
        setYoutubeStatusMessage(undefined);
      }
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
      setIsSubmittingProject(true);
      let projectToCreate = creatingProject;

      try {
        if (
          selectedDataSource === DataSource.stream &&
          getProjectSourceUrl(projectToCreate) &&
          (
            parseAppleMusicAlbumUrl(getProjectSourceUrl(projectToCreate)) ||
            parseAppleMusicSongUrl(getProjectSourceUrl(projectToCreate))
          )
        ) {
          await handleStreamUrlBlur(getProjectSourceUrl(projectToCreate));
          return;
        }

        if (
          selectedDataSource === DataSource.stream &&
          projectToCreate &&
          Boolean(getProjectSourcePluginForProject(projectToCreate))
        ) {
          try {
            const sourcePlugin = getProjectSourcePluginForProject(projectToCreate);
            setYoutubeStatusMessage(
              sourcePlugin?.resolvingMessage ?? "Preparing source..."
            );
            projectToCreate = await resolveProjectSource(projectToCreate);
            setAudioUrlValid(true);
            setCreatingProject(projectToCreate);
          } catch (error) {
            console.error("Failed to resolve YouTube audio:", error);
            setAudioUrlValid(false);
            setCreateProjectOutcome(CreateProjectOutcome.invalidStreamUrl);
            setAttemptToCreateFailed(true);
            return;
          }
        }

        if (
          selectedDataSource === DataSource.stream &&
          getProjectSourceUrl(projectToCreate)
        ) {
          const valid = isValidUrl(getProjectSourceUrl(projectToCreate));
          setAudioUrlValid(valid);
          if (!valid) {
            setCreateProjectOutcome(CreateProjectOutcome.invalidStreamUrl);
            setAttemptToCreateFailed(true);
            return;
          }
        }

        if (
          projectToCreate &&
          projectToCreate.name &&
          getProjectSourceUrl(projectToCreate) &&
          !(await isProjectExist(projectToCreate))
        ) {
          await saveProject({
            id: projectToCreate?.name,
            projectDetail: projectToCreate,
            lyricTexts: [],
            lyricReference: "",
            generatedImageLog: [],
            promptLog: [],
            images: [],
          });

          const projects = await loadProjects();
          setExistingProjects(projects);

          setEditingProject(projectToCreate);
          setLyricTexts([]);
          setUnSavedLyricReference("");
          setLyricReference("");
          setPromptLog([]);
          setGeneratedImageLog([]);

          markAsSaved();
          close();
          setCreatingProject(undefined);
        } else {
          if (projectToCreate && projectToCreate.audioFileUrl.length === 0) {
            if (selectedDataSource === DataSource.local) {
              setCreateProjectOutcome(CreateProjectOutcome.missingLocalAudio);
            } else {
              setCreateProjectOutcome(CreateProjectOutcome.missingStreamUrl);
            }
          } else if (
            projectToCreate &&
            projectToCreate.name.length !== 0 &&
            (await isProjectExist(projectToCreate))
          ) {
            setCreateProjectOutcome(CreateProjectOutcome.duplicate);
          } else if (projectToCreate && !projectToCreate.name) {
            setCreateProjectOutcome(CreateProjectOutcome.missingName);
          }
          setAttemptToCreateFailed(true);
        }
      } finally {
        setYoutubeStatusMessage(undefined);
        setIsSubmittingProject(false);
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
          setYoutubeStatusMessage(undefined);
          setIsSubmittingProject(false);
          stopTopAppleSongPreview();
        }
      }}
      isOpen={isProjectDialogOpen}
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
              youtubeStatusMessage={youtubeStatusMessage}
              topAppleSongs={suggestedTopAppleSongs}
              onTopAppleSongPress={handleTopAppleSongSelect}
              onPreviewTopAppleSongPress={handleTopAppleSongPreview}
              previewingTopAppleSongId={previewingTopAppleSongId}
              loadingTopAppleSongPreviewId={loadingTopAppleSongPreviewId}
              isLoadingTopAppleSongs={isLoadingTopAppleSongs}
              showTopAppleSongs={!isEdit}
            />
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <DialogTrigger isOpen={attemptToCreateFailed}>
              <Button
                variant="cta"
                onPress={onCreatePressed(close)}
                isDisabled={isSubmittingProject || !!youtubeStatusMessage || isResolvingAppleMusic}
              >
                {isSubmittingProject ? "Working..." : isEdit ? "Save Edit" : "Create"}
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
