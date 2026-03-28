import { ProjectDetail } from "../types";
import { parseAppleMusicAlbumUrl, parseAppleMusicSongUrl } from "../appleMusic";
import { ProjectSourcePlugin, ProjectSourceTagAppearance } from "./types";
import { localFileProjectSourcePlugin } from "./localFilePlugin";
import { youtubeProjectSourcePlugin } from "./youtubePlugin";

export interface ProjectSourceTagInfo {
  label: string;
  appearance: ProjectSourceTagAppearance;
}

const defaultTagAppearance: ProjectSourceTagAppearance = {
  background: "rgba(255, 255, 255, 0.08)",
  borderColor: "rgba(255, 255, 255, 0.12)",
  color: "rgba(255, 255, 255, 0.72)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

const appleMusicPreviewTagInfo: ProjectSourceTagInfo = {
  label: "AM Preview",
  appearance: {
    background: "rgba(250, 57, 98, 0.15)",
    borderColor: "rgba(250, 57, 98, 0.3)",
    color: "rgba(255, 216, 224, 0.96)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  },
};

const projectSourcePlugins: ProjectSourcePlugin[] = [
  localFileProjectSourcePlugin,
  youtubeProjectSourcePlugin,
];

export function getProjectSourcePluginForUrl(url: string) {
  return projectSourcePlugins.find((plugin) => plugin.matchesUrl(url));
}

export function getProjectSourcePluginForProject(projectDetail: ProjectDetail) {
  return projectSourcePlugins.find((plugin) => plugin.matchesProject(projectDetail));
}

export function getProjectSourceTagInfo(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return undefined;
  }

  const plugin = getProjectSourcePluginForProject(projectDetail);
  const pluginTagLabel = plugin?.tagLabel;

  if (pluginTagLabel) {
    return {
      label: pluginTagLabel,
      appearance: plugin?.tagAppearance ?? defaultTagAppearance,
    };
  }

  const sourceUrl = projectDetail.appleMusicAlbumUrl ?? projectDetail.audioFileUrl;

  if (
    projectDetail.appleMusicTrackId ||
    projectDetail.appleMusicAlbumUrl ||
    parseAppleMusicSongUrl(sourceUrl) ||
    parseAppleMusicAlbumUrl(sourceUrl)
  ) {
    return appleMusicPreviewTagInfo;
  }

  return undefined;
}

export function clearProjectSourceMetadata(projectDetail: ProjectDetail) {
  return projectSourcePlugins.reduce(
    (currentProjectDetail, plugin) =>
      plugin.clearProjectMetadata
        ? plugin.clearProjectMetadata(currentProjectDetail)
        : currentProjectDetail,
    projectDetail
  );
}

export function hasCachedProjectSource(projectDetail: ProjectDetail) {
  const plugin = getProjectSourcePluginForProject(projectDetail);
  return Boolean(plugin?.getCachedProjectDetail?.(projectDetail));
}

export function getCachedProjectSourceDetail(projectDetail: ProjectDetail) {
  const plugin = getProjectSourcePluginForProject(projectDetail);
  return plugin?.getCachedProjectDetail?.(projectDetail) ?? projectDetail;
}

export function clearPersistedProjectSourceCache(projectDetail: ProjectDetail) {
  const plugin = getProjectSourcePluginForProject(projectDetail);
  plugin?.clearPersistedCache?.(projectDetail);
}

export function getProjectPlaybackUrl(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return undefined;
  }

  const plugin = getProjectSourcePluginForProject(projectDetail);

   if (plugin) {
    return plugin.getPlaybackUrl?.(projectDetail) ?? projectDetail.playbackAudioFileUrl;
  }

  return (
    projectDetail.playbackAudioFileUrl ??
    projectDetail.audioFileUrl
  );
}

export function getProjectSourceUrl(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return "";
  }

  const plugin = getProjectSourcePluginForProject(projectDetail);
  return plugin?.getSourceUrl?.(projectDetail) ?? projectDetail.audioFileUrl;
}

export function getProjectSourceLoadingMessage(projectDetail: ProjectDetail) {
  const plugin = getProjectSourcePluginForProject(projectDetail);
  return plugin?.getLoadingMessage(projectDetail);
}

export function getProjectSourceResolveMessages(url: string) {
  const plugin = getProjectSourcePluginForUrl(url);

  if (!plugin) {
    return undefined;
  }

  return {
    checkingMessage: plugin.checkingMessage,
    resolvingMessage: plugin.resolvingMessage,
  };
}

export async function resolveProjectSource(projectDetail: ProjectDetail) {
  const plugin = getProjectSourcePluginForProject(projectDetail);

  if (!plugin) {
    return projectDetail;
  }

  return plugin.resolveProjectDetail(projectDetail);
}