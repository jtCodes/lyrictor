import { AlertDialog, DialogTrigger, Flex, Heading, View, Text } from "@adobe/react-spectrum";
import { useState } from "react";
import "./Project.css";
import { Project, ProjectDetail } from "./types";
import { useProjectStore, deleteProject } from "./store";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../Auth/store";
import { DropdownMenu, DropdownMenuItem } from "../components/DropdownMenu";
import { usePublishProject } from "./usePublishProject";
import { publishedProjectPath } from "./utils";
import { ToastQueue } from "@react-spectrum/toast";

export default function ProjectCard({ project, onPublishChange }: { project: Project; onPublishChange?: () => void }) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const setAutoPlayRequested = useProjectStore((state) => state.setAutoPlayRequested);

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
  const publishedDocId = (project as any).id;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { publishedId, isPublishing, publish, unpublish, canPublish } =
    usePublishProject(isOwn ? project.projectDetail.name : undefined, onPublishChange);

  function handleEdit() {
    setAutoPlayRequested(true);
    setEditingProject(project.projectDetail as unknown as ProjectDetail);
    setLyricReference(project.lyricReference);
    setLyricTexts(project.lyricTexts);
    setImageItems(project.images ?? []);
  }

  function handleView() {
    navigate(publishedProjectPath(publishedDocId ?? project.id));
  }

  const displayName = isDemo
    ? project.projectDetail.name.replace("(Demo)", "").trim()
    : project.projectDetail.name;

  return (
    <div onClick={isOwn ? handleEdit : handleView} style={{ position: "relative" }}>
      <View
        UNSAFE_className={`card ${isSelected ? "card-selected" : ""}`}
        padding="size-300"
        borderRadius="medium"
        width="size-2400"
        backgroundColor={"gray-50"}
        minHeight={"size-2000"}
        UNSAFE_style={{
          border: isSelected
            ? "1px solid rgba(255, 255, 255, 0.22)"
            : "1px solid rgba(255, 255, 255, 0.13)",
          position: "relative",
        }}
      >
        {isOwn && publishedId && (
          <div
            title="Published"
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "rgba(80, 200, 120, 0.7)",
            }}
          />
        )}
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
          <DropdownMenu
            trigger={
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255, 255, 255, 0.5)",
                  transition: "background-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                }}
              >
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
            <DropdownMenuItem
              onClick={handleEdit}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              }
            >
              Edit
            </DropdownMenuItem>
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
            {isOwn && (
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
        <Flex
          direction={"column"}
          height={"size-2000"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Flex direction={"column"} gap={8} alignItems={"center"}>
            {project.projectDetail.albumArtSrc ? (
              <View>
                <img
                  height={56}
                  width={56}
                  style={{
                    objectFit: "contain",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255, 0.08)",
                  }}
                  src={project.projectDetail.albumArtSrc}
                />
              </View>
            ) : null}
            <View>
              <Text
                UNSAFE_style={{
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "center",
                  lineHeight: 1.35,
                  display: "block",
                }}
              >
                {displayName}
              </Text>
              {isDemo && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.45)",
                  }}
                >
                  Demo
                </span>
              )}
            </View>
          </Flex>
          <View>
            <span style={{ fontSize: 11, letterSpacing: 0.2 }}>
              <span style={{ opacity: 0.35 }}>by </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const name = (project as any).username || (isOwn ? authUsername : null) || "lyrictor";
                  navigate(`/user/${name}`);
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.85";
                  (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.55";
                  (e.currentTarget as HTMLElement).style.textDecoration = "none";
                }}
                style={{ opacity: 0.55, fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
              >
                {(project as any).username || (isOwn ? authUsername : null) || "Lyrictor"}
              </span>
            </span>
          </View>
        </Flex>
      </View>
      {isOwn && (
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
