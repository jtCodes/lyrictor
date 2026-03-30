import { useState } from "react";
import DesktopAppRequiredPopup from "../components/DesktopAppRequiredPopup";
import { isDesktopApp } from "../platform";
import { getProjectSourcePluginForProject } from "./sourcePlugins";
import { ProjectDetail } from "./types";

const DEFAULT_DESKTOP_APP_REQUIRED_DESCRIPTION =
  "YouTube-backed projects need the Lyrictor desktop app so audio can be resolved locally. Download the dmg from the GitHub releases page to open these projects.";

export function requiresDesktopAppToOpenProject(projectDetail?: ProjectDetail) {
  if (!projectDetail) {
    return false;
  }

  const sourcePlugin = getProjectSourcePluginForProject(projectDetail);
  return !isDesktopApp && sourcePlugin?.id === "youtube";
}

export function useProjectOpenGuard({
  desktopAppRequiredDescription = DEFAULT_DESKTOP_APP_REQUIRED_DESCRIPTION,
  onDesktopAppRequiredPopupClose,
}: {
  desktopAppRequiredDescription?: string;
  onDesktopAppRequiredPopupClose?: () => void;
} = {}) {
  const [isDesktopAppRequiredPopupOpen, setIsDesktopAppRequiredPopupOpen] =
    useState(false);

  function canOpenProject(
    projectDetail?: ProjectDetail,
    onBlocked?: () => void
  ) {
    if (!requiresDesktopAppToOpenProject(projectDetail)) {
      return true;
    }

    onBlocked?.();
    setIsDesktopAppRequiredPopupOpen(true);
    return false;
  }

  return {
    canOpenProject,
    desktopAppRequiredPopup: (
      <DesktopAppRequiredPopup
        isOpen={isDesktopAppRequiredPopupOpen}
        onClose={() => {
          setIsDesktopAppRequiredPopupOpen(false);
          onDesktopAppRequiredPopupClose?.();
        }}
        description={desktopAppRequiredDescription}
      />
    ),
  };
}
