import { ToastQueue } from "@react-spectrum/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store";
import { ProjectDetail } from "../types";
import {
  clearPersistedProjectSourceCache,
  getCachedProjectSourceDetail,
  getProjectPlaybackUrl,
  getProjectSourceLoadingMessage,
  getProjectSourcePluginForProject,
  resolveProjectSource,
} from ".";

function getSourceKey(projectDetail: ProjectDetail) {
  return `${projectDetail.name}:${projectDetail.audioFileUrl}`;
}

function hasSourceMetadataChanged(
  currentProjectDetail: ProjectDetail,
  nextProjectDetail: ProjectDetail
) {
  return (
    currentProjectDetail.playbackAudioFileUrl !== nextProjectDetail.playbackAudioFileUrl ||
    currentProjectDetail.cachedAudioFilePath !== nextProjectDetail.cachedAudioFilePath ||
    currentProjectDetail.youtubeSourceUrl !== nextProjectDetail.youtubeSourceUrl ||
    currentProjectDetail.youtubeVideoId !== nextProjectDetail.youtubeVideoId ||
    currentProjectDetail.youtubeDurationSeconds !== nextProjectDetail.youtubeDurationSeconds ||
    currentProjectDetail.localAudioFilePath !== nextProjectDetail.localAudioFilePath ||
    currentProjectDetail.audioFileUrl !== nextProjectDetail.audioFileUrl
  );
}

export function useResolvedProjectPlayback(
  projectDetail?: ProjectDetail,
  onProjectDetailResolved?: (projectDetail: ProjectDetail) => void
) {
  const [resolvedProjectDetail, setResolvedProjectDetail] = useState(projectDetail);
  const currentProjectRef = useRef<ProjectDetail | undefined>(projectDetail);
  const sourceResolveKeyRef = useRef<string | null>(null);
  const sourceFallbackKeyRef = useRef<string | null>(null);
  const projectVersionRef = useRef(0);
  const setProjectActionMessage = useProjectStore((state) => state.setProjectActionMessage);

  const commitResolvedProjectDetail = useCallback(
    (nextProjectDetail: ProjectDetail) => {
      setResolvedProjectDetail(nextProjectDetail);
      currentProjectRef.current = nextProjectDetail;
      onProjectDetailResolved?.(nextProjectDetail);
    },
    [onProjectDetailResolved]
  );

  useEffect(() => {
    projectVersionRef.current += 1;
    setResolvedProjectDetail(projectDetail);
    currentProjectRef.current = projectDetail;

    if (!projectDetail) {
      sourceResolveKeyRef.current = null;
      sourceFallbackKeyRef.current = null;
    }
  }, [projectDetail]);

  useEffect(() => {
    if (!resolvedProjectDetail) {
      sourceResolveKeyRef.current = null;
      sourceFallbackKeyRef.current = null;
      return;
    }

    const cachedProjectDetail = getCachedProjectSourceDetail(resolvedProjectDetail);
    const sourceKey = getSourceKey(resolvedProjectDetail);

    if (hasSourceMetadataChanged(resolvedProjectDetail, cachedProjectDetail)) {
      sourceFallbackKeyRef.current = null;
      commitResolvedProjectDetail(cachedProjectDetail);
      return;
    }

    if (getProjectPlaybackUrl(resolvedProjectDetail)) {
      sourceResolveKeyRef.current = null;
      return;
    }

    const sourcePlugin = getProjectSourcePluginForProject(resolvedProjectDetail);

    if (!sourcePlugin || sourceResolveKeyRef.current === sourceKey) {
      return;
    }

    sourceResolveKeyRef.current = sourceKey;
    setProjectActionMessage(getProjectSourceLoadingMessage(resolvedProjectDetail));

    let cancelled = false;
    const projectVersion = projectVersionRef.current;

    resolveProjectSource(resolvedProjectDetail)
      .then((nextProjectDetail) => {
        if (cancelled || projectVersion !== projectVersionRef.current) {
          return;
        }

        sourceFallbackKeyRef.current = null;
        commitResolvedProjectDetail(nextProjectDetail);
      })
      .catch((error) => {
        if (cancelled || projectVersion !== projectVersionRef.current) {
          return;
        }

        ToastQueue.negative(
          error instanceof Error
            ? `Failed to load YouTube audio: ${error.message}`
            : "Failed to load YouTube audio",
          {
            timeout: 4000,
          }
        );
      })
      .finally(() => {
        if (cancelled || projectVersion !== projectVersionRef.current) {
          return;
        }

        setProjectActionMessage(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [commitResolvedProjectDetail, resolvedProjectDetail, setProjectActionMessage]);

  const handlePlaybackLoadError = useCallback(async () => {
    const currentProject = currentProjectRef.current;
    const projectVersion = projectVersionRef.current;

    if (!currentProject) {
      return;
    }

    const sourcePlugin = getProjectSourcePluginForProject(currentProject);
    const playbackUrl = getProjectPlaybackUrl(currentProject);
    const sourceKey = getSourceKey(currentProject);
    const isYoutubeCachedPlayback =
      sourcePlugin?.id === "youtube" &&
      Boolean(currentProject.cachedAudioFilePath || currentProject.playbackAudioFileUrl) &&
      Boolean(playbackUrl?.startsWith("lyrictor-media://youtube-cache/"));

    if (!isYoutubeCachedPlayback || sourceFallbackKeyRef.current === sourceKey) {
      return;
    }

    sourceFallbackKeyRef.current = sourceKey;
    clearPersistedProjectSourceCache(currentProject);
    setProjectActionMessage(getProjectSourceLoadingMessage(currentProject));

    try {
      const nextProjectDetail = await resolveProjectSource({
        ...currentProject,
        playbackAudioFileUrl: undefined,
        cachedAudioFilePath: undefined,
      });

      if (projectVersion !== projectVersionRef.current) {
        return;
      }

      commitResolvedProjectDetail(nextProjectDetail);
    } catch (error) {
      if (projectVersion !== projectVersionRef.current) {
        return;
      }

      ToastQueue.negative(
        error instanceof Error
          ? `Failed to load YouTube audio: ${error.message}`
          : "Failed to load YouTube audio",
        {
          timeout: 4000,
        }
      );
    } finally {
      if (projectVersion === projectVersionRef.current) {
        setProjectActionMessage(undefined);
      }
    }
  }, [commitResolvedProjectDetail, setProjectActionMessage]);

  return {
    resolvedProjectDetail,
    playbackUrl: getProjectPlaybackUrl(resolvedProjectDetail),
    handlePlaybackLoadError,
  };
}