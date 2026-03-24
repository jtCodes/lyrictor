import { ProjectDetail } from "../types";
import { ProjectSourcePlugin } from "./types";
import { youtubeProjectSourcePlugin } from "./youtubePlugin";

const projectSourcePlugins: ProjectSourcePlugin[] = [youtubeProjectSourcePlugin];

export function getProjectSourcePluginForUrl(url: string) {
  return projectSourcePlugins.find((plugin) => plugin.matchesUrl(url));
}

export function getProjectSourcePluginForProject(projectDetail: ProjectDetail) {
  return projectSourcePlugins.find((plugin) => plugin.matchesProject(projectDetail));
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

  const cachedProjectDetail = plugin.getCachedProjectDetail?.(projectDetail);

  if (cachedProjectDetail) {
    return cachedProjectDetail;
  }

  return plugin.resolveProjectDetail(projectDetail);
}