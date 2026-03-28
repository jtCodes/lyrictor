import { ToastQueue } from "@react-spectrum/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store";
import { ProjectDetail } from "../types";
import {
  getProjectPlaybackUrl,
  getProjectSourceLoadingMessage,
  getProjectSourcePluginForProject,
  resolveProjectSource,
} from ".";

function getSourceKey(projectDetail: ProjectDetail) {
  return `${projectDetail.name}:${projectDetail.audioFileUrl}`;
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
  const projectVersionRef = useRef(0);
  const setProjectActionMessage = useProjectStore((state) => state.setProjectActionMessage);

  const stageResolvedProjectDetail = useCallback((nextProjectDetail: ProjectDetail) => {
    setResolvedProjectDetail(nextProjectDetail);
    currentProjectRef.current = nextProjectDetail;
  }, []);

  const commitResolvedProjectDetail = useCallback(
    (nextProjectDetail: ProjectDetail) => {
      stageResolvedProjectDetail(nextProjectDetail);
      onProjectDetailResolved?.(nextProjectDetail);
    },
    [onProjectDetailResolved, stageResolvedProjectDetail]
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

    const sourceKey = getSourceKey(resolvedProjectDetail);
    const sourcePlugin = getProjectSourcePluginForProject(resolvedProjectDetail);
    if (getProjectPlaybackUrl(resolvedProjectDetail)) {
      sourceResolveKeyRef.current = null;
      return;
    }

    if (!sourcePlugin || sourceResolveKeyRef.current === sourceKey) {
      return;
    }

    sourceResolveKeyRef.current = sourceKey;
    let cancelled = false;
    const projectVersion = projectVersionRef.current;

    setProjectActionMessage(getProjectSourceLoadingMessage(resolvedProjectDetail));

    resolveProjectSource(resolvedProjectDetail)
      .then((resolvedNextProjectDetail) => {
        if (cancelled || projectVersion !== projectVersionRef.current) {
          return;
        }

        sourceFallbackKeyRef.current = null;
        setPlaybackReloadToken((currentValue) => currentValue + 1);
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