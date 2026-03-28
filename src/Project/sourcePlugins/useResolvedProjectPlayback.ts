import { ToastQueue } from "@react-spectrum/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { cachedDesktopFileExists } from "../../desktop/bridge";
import { isDesktopApp } from "../../platform";
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

function withPlaybackReloadToken(url: string | undefined, reloadToken: number) {
  if (!url || !url.startsWith("lyrictor-media://youtube-cache/")) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}reload=${reloadToken}`;
}

export function useResolvedProjectPlayback(
  projectDetail?: ProjectDetail,
  onProjectDetailResolved?: (projectDetail: ProjectDetail) => void
) {
  const [resolvedProjectDetail, setResolvedProjectDetail] = useState(projectDetail);
  const [playbackReloadToken, setPlaybackReloadToken] = useState(0);
  const currentProjectRef = useRef<ProjectDetail | undefined>(projectDetail);
  const sourceResolveKeyRef = useRef<string | null>(null);
  const sourceFallbackKeyRef = useRef<string | null>(null);
  const cacheRecoveryKeyRef = useRef<string | null>(null);
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
      cacheRecoveryKeyRef.current = null;
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
    const sourcePlugin = getProjectSourcePluginForProject(resolvedProjectDetail);
    let cancelled = false;
    const projectVersion = projectVersionRef.current;

    const syncResolvedProjectDetail = async () => {
      let nextProjectDetail = resolvedProjectDetail;

      if (hasSourceMetadataChanged(resolvedProjectDetail, cachedProjectDetail)) {
        if (
          isDesktopApp &&
          sourcePlugin?.id === "youtube" &&
          cachedProjectDetail.cachedAudioFilePath
        ) {
          const cachedFileExists = await cachedDesktopFileExists(
            cachedProjectDetail.cachedAudioFilePath
          );

          if (cancelled || projectVersion !== projectVersionRef.current) {
            return;
          }

          if (cachedFileExists) {
            sourceFallbackKeyRef.current = null;
            commitResolvedProjectDetail(cachedProjectDetail);
            return;
          }

          clearPersistedProjectSourceCache(cachedProjectDetail);
          nextProjectDetail = {
            ...resolvedProjectDetail,
            playbackAudioFileUrl: undefined,
            cachedAudioFilePath: undefined,
          };
        } else {
          sourceFallbackKeyRef.current = null;
          commitResolvedProjectDetail(cachedProjectDetail);
          return;
        }
      }

      if (getProjectPlaybackUrl(nextProjectDetail)) {
        sourceResolveKeyRef.current = null;
        return;
      }

      if (!sourcePlugin || sourceResolveKeyRef.current === sourceKey) {
        return;
      }

      sourceResolveKeyRef.current = sourceKey;
      setProjectActionMessage(getProjectSourceLoadingMessage(nextProjectDetail));

      resolveProjectSource(nextProjectDetail)
        .then((resolvedNextProjectDetail) => {
          if (cancelled || projectVersion !== projectVersionRef.current) {
            return;
          }

          sourceFallbackKeyRef.current = null;
          commitResolvedProjectDetail(resolvedNextProjectDetail);
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
    };

    syncResolvedProjectDetail().catch((error) => {
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
      setProjectActionMessage(undefined);
    });

    return () => {
      cancelled = true;
    };
  }, [commitResolvedProjectDetail, resolvedProjectDetail, setProjectActionMessage]);

  useEffect(() => {
    if (!isDesktopApp || !resolvedProjectDetail) {
      cacheRecoveryKeyRef.current = null;
      return;
    }

    const sourcePlugin = getProjectSourcePluginForProject(resolvedProjectDetail);
    const playbackUrl = getProjectPlaybackUrl(resolvedProjectDetail);
    const sourceKey = getSourceKey(resolvedProjectDetail);
    const cachedAudioFilePath = resolvedProjectDetail.cachedAudioFilePath;
    const isYoutubeCachedPlayback =
      sourcePlugin?.id === "youtube" &&
      Boolean(cachedAudioFilePath) &&
      Boolean(playbackUrl?.startsWith("lyrictor-media://youtube-cache/"));

    if (!isYoutubeCachedPlayback || !cachedAudioFilePath) {
      cacheRecoveryKeyRef.current = null;
      return;
    }

    let cancelled = false;
    const projectVersion = projectVersionRef.current;

    cachedDesktopFileExists(cachedAudioFilePath)
      .then(async (exists) => {
        if (cancelled || projectVersion !== projectVersionRef.current || exists) {
          if (exists) {
            cacheRecoveryKeyRef.current = null;
          }
          return;
        }

        if (cacheRecoveryKeyRef.current === sourceKey) {
          return;
        }

        cacheRecoveryKeyRef.current = sourceKey;
        clearPersistedProjectSourceCache(resolvedProjectDetail);
        setProjectActionMessage(getProjectSourceLoadingMessage(resolvedProjectDetail));

        try {
          const nextProjectDetail = await resolveProjectSource({
            ...resolvedProjectDetail,
            playbackAudioFileUrl: undefined,
            cachedAudioFilePath: undefined,
          });

          if (cancelled || projectVersion !== projectVersionRef.current) {
            return;
          }

          commitResolvedProjectDetail(nextProjectDetail);
          setPlaybackReloadToken((currentValue) => currentValue + 1);
          cacheRecoveryKeyRef.current = null;
        } catch (error) {
          if (cancelled || projectVersion !== projectVersionRef.current) {
            return;
          }

          ToastQueue.negative(
            error instanceof Error
              ? `Failed to reload deleted YouTube cache: ${error.message}`
              : "Failed to reload deleted YouTube cache",
            {
              timeout: 4000,
            }
          );
        } finally {
          if (!cancelled && projectVersion === projectVersionRef.current) {
            setProjectActionMessage(undefined);
          }
        }
      })
      .catch(() => {
        if (!cancelled && projectVersion === projectVersionRef.current) {
          cacheRecoveryKeyRef.current = null;
        }
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
      setPlaybackReloadToken((currentValue) => currentValue + 1);
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
    playbackUrl: withPlaybackReloadToken(
      getProjectPlaybackUrl(resolvedProjectDetail),
      playbackReloadToken
    ),
    handlePlaybackLoadError,
  };
}