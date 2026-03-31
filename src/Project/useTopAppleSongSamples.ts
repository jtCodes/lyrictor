import { ToastQueue } from "@react-spectrum/toast";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  AppleMusicAlbumTrack,
  AppleMusicTopSong,
  fetchTopAppleMusicSongs,
  pickDiverseTopSongs,
  resolveAppleMusicSongTrackById,
} from "./appleMusic";
import { DataSource } from "./CreateNewProjectForm";
import { EditingMode, ProjectDetail, VideoAspectRatio } from "./types";

interface UseTopAppleSongSamplesArgs {
  isEdit: boolean;
  isProjectDialogOpen: boolean;
  pause: () => void;
  setCreatingProject: Dispatch<SetStateAction<ProjectDetail | undefined>>;
  setSelectedDataSource: (dataSource: DataSource) => void;
  setAudioUrlValid: (isValid: boolean) => void;
}

export default function useTopAppleSongSamples({
  isEdit,
  isProjectDialogOpen,
  pause,
  setCreatingProject,
  setSelectedDataSource,
  setAudioUrlValid,
}: UseTopAppleSongSamplesArgs) {
  const [topAppleSongs, setTopAppleSongs] = useState<AppleMusicTopSong[]>([]);
  const [isLoadingTopAppleSongs, setIsLoadingTopAppleSongs] = useState(false);
  const [topAppleSongsPickerOpen, setTopAppleSongsPickerOpen] = useState(false);
  const [selectedTopAppleSongId, setSelectedTopAppleSongId] = useState<string | undefined>();
  const [topAppleSongPreviewById, setTopAppleSongPreviewById] = useState<
    Record<string, AppleMusicAlbumTrack>
  >({});
  const [previewingTopAppleSongId, setPreviewingTopAppleSongId] = useState<string>();
  const [loadingTopAppleSongPreviewId, setLoadingTopAppleSongPreviewId] = useState<string>();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const suggestedTopAppleSongs = useMemo(
    () => pickDiverseTopSongs(topAppleSongs, 5),
    [topAppleSongs]
  );

  useEffect(() => {
    if (!isProjectDialogOpen || isEdit || topAppleSongs.length > 0) {
      return;
    }

    let isCancelled = false;

    const loadTopAppleSongs = async () => {
      setIsLoadingTopAppleSongs(true);

      try {
        const songs = await fetchTopAppleMusicSongs("us", 100);
        const newestSongs = [...songs].sort((leftSong, rightSong) => {
          const leftDate = leftSong.releaseDate ? Date.parse(leftSong.releaseDate) : 0;
          const rightDate = rightSong.releaseDate ? Date.parse(rightSong.releaseDate) : 0;
          return rightDate - leftDate;
        });

        if (isCancelled) {
          return;
        }

        setTopAppleSongs(newestSongs);
        setSelectedTopAppleSongId((currentValue) => currentValue ?? newestSongs[0]?.id);
      } catch (error) {
        console.error("Failed to load top Apple songs:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingTopAppleSongs(false);
        }
      }
    };

    void loadTopAppleSongs();

    return () => {
      isCancelled = true;
    };
  }, [isEdit, isProjectDialogOpen, topAppleSongs.length]);

  useEffect(() => {
    return () => {
      const previewAudio = previewAudioRef.current;

      if (!previewAudio) {
        return;
      }

      previewAudio.pause();
      previewAudio.removeAttribute("src");
      previewAudio.load();
    };
  }, []);

  function stopTopAppleSongPreview() {
    if (!previewAudioRef.current) {
      setPreviewingTopAppleSongId(undefined);
      return;
    }

    previewAudioRef.current.pause();
    previewAudioRef.current.currentTime = 0;
    setPreviewingTopAppleSongId(undefined);
  }

  function handleBrowseTopAppleSongs() {
    if (topAppleSongs.length === 0) {
      return;
    }

    setSelectedTopAppleSongId((currentValue) => currentValue ?? topAppleSongs[0]?.id);
    setTopAppleSongsPickerOpen(true);
  }

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
          } satisfies ProjectDetail;
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
    }
  }

  function resetTopAppleSongSamples() {
    setTopAppleSongsPickerOpen(false);
    setSelectedTopAppleSongId(undefined);
    setLoadingTopAppleSongPreviewId(undefined);
    stopTopAppleSongPreview();
  }

  return {
    topAppleSongs,
    suggestedTopAppleSongs,
    isLoadingTopAppleSongs,
    topAppleSongsPickerOpen,
    setTopAppleSongsPickerOpen,
    selectedTopAppleSongId,
    setSelectedTopAppleSongId,
    previewingTopAppleSongId,
    loadingTopAppleSongPreviewId,
    handleBrowseTopAppleSongs,
    handleTopAppleSongPreview,
    handleTopAppleSongSelect,
    resetTopAppleSongSamples,
  };
}