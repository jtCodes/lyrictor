import { AlertDialog, DialogTrigger, View, Text } from "@adobe/react-spectrum";
import { useState } from "react";
import "./Project.css";
import { Project, ProjectDetail } from "./types";
import { useProjectStore, deleteProject, resolveEditingProjectAccess } from "./store";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../Auth/store";
import { DropdownMenu, DropdownMenuItem } from "../components/DropdownMenu";
import { usePublishProject } from "./usePublishProject";
import { localPreviewProjectPath, publishedProjectPath } from "./utils";
import { ToastQueue } from "@react-spectrum/toast";
import DeviceLaptop from "@spectrum-icons/workflow/DeviceLaptop";
import { openExternalUrl } from "../runtime";
import {
  getProjectSourceLoadingMessage,
  getProjectSourceLinkInfo,
  getProjectSourcePluginForProject,
} from "./sourcePlugins";
import ProjectSourceTag from "./ProjectSourceTag";

function formatProjectCardDate(date: Date | string | undefined): string {
  if (!date) return "";

  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProjectCard({
  project,
  canDelete = false,
  onPublishChange,
  onBeforeProjectOpen,
  fillAvailableWidth = false,
}: {
  project: Project;
  canDelete?: boolean;
  onPublishChange?: () => void;
  onBeforeProjectOpen?: (project: Project) => boolean | Promise<boolean>;
  fillAvailableWidth?: boolean;
}) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setProjectActionMessage = useProjectStore(
    (state) => state.setProjectActionMessage
  );
  const setEditingProjectAccess = useProjectStore((state) => state.setEditingProjectAccess);
  const setPreviewProject = useProjectStore((state) => state.setPreviewProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const setAutoPlayRequested = useProjectStore((state) => state.setAutoPlayRequested);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);

  const user = useAuthStore((state) => state.user);

  const authUsername = useAuthStore((state) => state.username);

  const navigate = useNavigate();
  const isSelected = editingProject?.name === project.projectDetail.name;

  const hasDemoInName = project.projectDetail.name.includes("(Demo)");
  const isPublished = !!(project as any).publishedAt;
  const isOwn = !!user && (
    (project as any).uid === user.uid ||
    (!isPublished && !hasDemoInName && project.source !== "demo")
  );
  const isDemo = hasDemoInName && !isPublished;
  const canDeleteProject = canDelete && (project.source === "local" || isOwn);
  const publishedDocId = (project as any).id;
  const lastModifiedLabel = formatProjectCardDate(
    project.projectDetail.updatedDate ?? project.projectDetail.createdDate
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { publishedId, isPublishing, publish, unpublish, canPublish } =
    usePublishProject(isOwn ? project.projectDetail.name : undefined, onPublishChange);

  async function canOpenProject() {
    if (!onBeforeProjectOpen) {
      return true;
    }

    return onBeforeProjectOpen(project);
  }

  async function handleSelect() {
    if (isSelected) {
      return false;
    }

    try {
      const shouldContinue = await canOpenProject();

      if (!shouldContinue) {
        return false;
      }

      let projectDetail = project.projectDetail as unknown as ProjectDetail;
      const sourcePlugin = getProjectSourcePluginForProject(projectDetail);

      if (sourcePlugin) {
        setProjectActionMessage(getProjectSourceLoadingMessage(projectDetail));
      } else {
        setProjectActionMessage(undefined);
      }

      setAutoPlayRequested(true);
      setEditingProject(projectDetail);
      setEditingProjectAccess(await resolveEditingProjectAccess(project));
      setLyricReference(project.lyricReference);
      setLyricTexts(project.lyricTexts);
      setImageItems(project.images ?? []);
      markAsSaved();
      return true;
    } catch (error) {
      console.error("Failed to resolve YouTube audio:", error);
      ToastQueue.negative(
        error instanceof Error
          ? `Failed to load YouTube audio: ${error.message}`
          : "Failed to load YouTube audio",
        {
          timeout: 4000,
        }
      );
      return false;
    } finally {
      setProjectActionMessage(undefined);
    }
  }

  async function handleEdit() {
    try {
      const shouldContinue = await canOpenProject();

      if (!shouldContinue) {
        return;
      }

      const projectDetail = project.projectDetail as unknown as ProjectDetail;
      const sourcePlugin = getProjectSourcePluginForProject(projectDetail);

      if (sourcePlugin) {
        setProjectActionMessage(getProjectSourceLoadingMessage(projectDetail));
      } else {
        setProjectActionMessage(undefined);
      }

      setAutoPlayRequested(true);
      setEditingProject(projectDetail);
  setEditingProjectAccess(await resolveEditingProjectAccess(project));
      setLyricReference(project.lyricReference);
      setLyricTexts(project.lyricTexts);
      setImageItems(project.images ?? []);
      markAsSaved();
      navigate("/edit");
    } catch (error) {
      console.error("Failed to resolve YouTube audio:", error);
      ToastQueue.negative(
        error instanceof Error
          ? `Failed to load YouTube audio: ${error.message}`
          : "Failed to load YouTube audio",
        {
          timeout: 4000,
        }
      );
    }
  }

  async function handleView() {
    const shouldContinue = await canOpenProject();

    if (!shouldContinue) {
      return;
    }

    if (isOwn && !publishedId && !isDemo) {
      setPreviewProject(project);
      navigate(localPreviewProjectPath());
      return;
    }

    navigate(publishedProjectPath(publishedDocId ?? project.id));
  }

  const displayName = isDemo
    ? project.projectDetail.name.replace("(Demo)", "").trim()
    : project.projectDetail.name;
  const songName = project.projectDetail.songName;
  const artistName = project.projectDetail.artistName;
  const sourceLinkInfo = getProjectSourceLinkInfo(project.projectDetail);
  const authorLabel = project.source === "local"
    ? "me"
    : (project as any).username || (isOwn ? authUsername : null) || "Lyrictor";

  return (
    <div
      onClick={handleSelect}
      className={`project-card-shell${fillAvailableWidth ? " project-card-shell-fill" : ""}`}
    >
      <View
        UNSAFE_className={`card${isSelected ? " card-selected" : ""}${fillAvailableWidth ? " card-fill-available" : " card-fixed-width"}`}
      >
        {isOwn && publishedId && (
          <div title="Published" className="project-card-published-dot" />
        )}
        <div onClick={(e) => e.stopPropagation()} className="project-card-menu-anchor">
          <DropdownMenu
            trigger={
              <button className="project-card-menu-trigger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            }
            topOffset={28}
          >
            {(!isOwn || isPublished || isDemo) && (
              <DropdownMenuItem
                onClick={handleView}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                }
              >
                View
              </DropdownMenuItem>
            )}
            {(
              <DropdownMenuItem
                onClick={handleEdit}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                }
              >
                Edit
              </DropdownMenuItem>
            )}
            {isOwn && canPublish ? (
              <DropdownMenuItem
                onClick={() => publishedId ? unpublish() : publish(project)}
                icon={
                  publishedId
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                }
                destructive={!!publishedId}
              >
                {isPublishing ? "..." : publishedId ? "Unpublish" : "Publish"}
              </DropdownMenuItem>
            ) : null}
            {canDeleteProject && (
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                }
                destructive
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>
        <div className="project-card-layout">
          <div className="project-card-main">
            <div className="project-card-hero">
              {project.projectDetail.albumArtSrc ? (
                <div className="project-card-art-shell">
                  <img
                    className="project-card-art"
                    src={project.projectDetail.albumArtSrc}
                    alt={`${displayName} album art`}
                  />
                </div>
              ) : (
                <div className="project-card-art-shell project-card-art-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              )}
              <div className="project-card-summary">
                <div className="project-card-title-row">
                  <Text UNSAFE_className="project-card-title">{displayName}</Text>
                </div>
                {songName || artistName ? (
                  <div className="project-card-subtitle">
                    {songName ? (
                      <Text UNSAFE_className="project-card-song-name">{songName}</Text>
                    ) : null}
                    {artistName ? (
                      <Text UNSAFE_className="project-card-artist-name">{artistName}</Text>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="project-card-meta-row">
            <div className="project-card-source-meta">
              <ProjectSourceTag
                projectDetail={project.projectDetail}
                size="compact"
                onPress={
                  sourceLinkInfo
                    ? () => {
                        void openExternalUrl(sourceLinkInfo.url);
                      }
                    : undefined
                }
                ariaLabel={sourceLinkInfo?.label}
                title={sourceLinkInfo?.label}
              />
              {project.source === "local" ? (
                <span
                  className="project-card-storage-indicator"
                  aria-label="Stored locally"
                  title="Stored locally"
                >
                  <DeviceLaptop size="XXS" />
                  <span className="project-card-storage-label">Local</span>
                </span>
              ) : null}
            </div>
            <div className="project-card-date-row">
              {lastModifiedLabel ? <span className="project-card-date-value">{lastModifiedLabel}</span> : null}
            </div>
          </div>

          <div className="project-card-footer">
            <span className="project-card-byline-prefix">by</span>
            {project.source === "local" ? (
              <span className="project-card-author project-card-author-static">
                {authorLabel}
              </span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const name = (project as any).username || (isOwn ? authUsername : null) || "lyrictor";
                  navigate(`/user/${name}`);
                }}
                className="project-card-author"
              >
                {authorLabel}
              </span>
            )}
            {isDemo ? <span className="project-card-chip project-card-chip-footer">Demo</span> : null}
          </div>
        </div>
      </View>
      {canDeleteProject && (
        <DialogTrigger isOpen={showDeleteConfirm}>
          <span />
          <AlertDialog
            variant="warning"
            title="Delete project"
            cancelLabel="Cancel"
            primaryActionLabel="Delete"
            onCancel={() => setShowDeleteConfirm(false)}
            onPrimaryAction={async () => {
              setShowDeleteConfirm(false);
              try {
                await deleteProject(project);
                ToastQueue.info("Project deleted", { timeout: 3000 });
                onPublishChange?.();
              } catch {
                ToastQueue.negative("Failed to delete project", { timeout: 5000 });
              }
            }}
          >
            Are you sure you want to delete <strong>{displayName}</strong>?
            {publishedId ? " The published version will also be removed." : ""}
          </AlertDialog>
        </DialogTrigger>
      )}
    </div>
  );
}
