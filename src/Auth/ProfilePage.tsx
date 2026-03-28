import { useEffect, useState } from "react";
import { View } from "@adobe/react-spectrum";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAuthStore } from "./store";
import { useProjectStore, loadProjects } from "../Project/store";
import {
  loadProjectsFromFirestore,
  loadPublishedProjectsByUid,
} from "../Project/firestoreProjectService";
import { Project, ProjectDetail } from "../Project/types";
import { publishedProjectPath } from "../Project/utils";
import ProfileButton from "./ProfileButton";
import ProfileAvatar from "./ProfileAvatar";
import RSC from "react-scrollbars-custom";
import { motion } from "framer-motion";
import { ToastQueue } from "@react-spectrum/toast";
import {
  getProjectSourceLoadingMessage,
  getProjectSourcePluginForProject,
  resolveProjectSource,
} from "../Project/sourcePlugins";

interface ProfileData {
  username: string;
  uid: string;
}

export default function ProfilePage() {
  const { username: urlUsername } = useParams<{ username: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setProjectActionMessage = useProjectStore(
    (state) => state.setProjectActionMessage
  );
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);
  const setAutoPlayRequested = useProjectStore(
    (state) => state.setAutoPlayRequested
  );

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publishedProjects, setPublishedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"published" | "projects">("published");

  const isOwnProfile =
    currentUser && profile && currentUser.uid === profile.uid;

  useEffect(() => {
    if (!urlUsername) return;

    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);

      const lower = urlUsername.toLowerCase();

      // Special case: reserved "lyrictor" profile
      if (lower === "lyrictor") {
        setProfile({ username: "Lyrictor", uid: "__lyrictor__" });
        setLoading(false);
        return;
      }

      // Look up uid from usernames collection
      const usernameSnap = await getDoc(
        doc(db, "usernames", lower)
      );
      if (!usernameSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const uid = usernameSnap.data().uid;
      const displayUsername = usernameSnap.data().displayName ?? urlUsername;

      setProfile({ username: displayUsername, uid });
      setLoading(false);
    };

    fetchProfile();
  }, [urlUsername]);

  // Load own projects for own profile
  useEffect(() => {
    if (!isOwnProfile || !profile) return;

    const fetchProjects = async () => {
      const userProjects = await loadProjectsFromFirestore(profile.uid);
      setProjects(userProjects);
    };

    fetchProjects();
  }, [isOwnProfile, profile?.uid]);

  // Load published projects for any profile
  useEffect(() => {
    if (!profile) return;

    const fetchPublished = async () => {
      try {
        // Lyrictor profile shows demo projects
        if (profile.uid === "__lyrictor__") {
          const demos = await loadProjects(true);
          setPublishedProjects(demos);
          return;
        }
        const published = await loadPublishedProjectsByUid(profile.uid);
        setPublishedProjects(published);
      } catch {
        setPublishedProjects([]);
      }
    };

    fetchPublished();
  }, [profile?.uid]);

  async function handleProjectClick(project: Project) {
    try {
      const sourcePlugin = getProjectSourcePluginForProject(
        project.projectDetail as unknown as ProjectDetail
      );

      if (sourcePlugin) {
        setProjectActionMessage(
          getProjectSourceLoadingMessage(
            project.projectDetail as unknown as ProjectDetail
          )
        );
      }

      const projectDetail = await resolveProjectSource(
        project.projectDetail as unknown as ProjectDetail
      );

      setAutoPlayRequested(true);
      setEditingProject(projectDetail);
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
    } finally {
      setProjectActionMessage(undefined);
    }
  }

  if (notFound) {
    return (
      <View backgroundColor="gray-50" height="100vh" overflow="hidden">
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            zIndex: 10,
          }}
        >
          <BackButton onClick={() => navigate("/")} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: 15,
          }}
        >
          User not found
        </div>
      </View>
    );
  }

  return (
    <View backgroundColor="gray-50" height="100vh" overflow="hidden">
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          zIndex: 10,
        }}
      >
        <ProfileButton />
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          zIndex: 10,
        }}
      >
        <BackButton onClick={() => navigate("/")} />
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingTop: 56,
        }}
      >
        {/* User Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "32px 24px 24px",
          }}
        >
          <ProfileAvatar
            displayName={profile?.username}
            size={72}
          />

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.92)",
                letterSpacing: 0.3,
              }}
            >
              {loading ? "" : (profile?.username ?? urlUsername)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            padding: "0 24px",
          }}
        >
          <TabButton
            label="Published"
            count={publishedProjects.length}
            active={activeTab === "published"}
            onClick={() => setActiveTab("published")}
          />
          {isOwnProfile && (
            <TabButton
              label="My Projects"
              count={projects.length}
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
            />
          )}
        </div>

        {/* Single scroll container */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: "0 24px",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 90%, rgba(0,0,0,0.3) 97%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 90%, rgba(0,0,0,0.3) 97%, transparent 100%)",
            position: "relative",
          }}
        >
          <RSC
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            trackYProps={{
              style: {
                width: 6,
                top: 4,
                bottom: 4,
                borderRadius: 3,
                background: "rgba(255,255,255,0.04)",
              },
            }}
            thumbYProps={{
              style: {
                borderRadius: 3,
                background: "rgba(255,255,255,0.12)",
              },
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "8px 24px 32px",
              }}
            >
              {activeTab === "published" &&
                (publishedProjects.length === 0 ? (
                  <div
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      color: "rgba(255, 255, 255, 0.3)",
                      fontSize: 13,
                    }}
                  >
                    No published lyrictors yet
                  </div>
                ) : (
                  publishedProjects.map((project) => (
                    <ProfileProjectRow
                      key={project.id}
                      project={project}
                      onClick={() => navigate(publishedProjectPath(project.id))}
                    />
                  ))
                ))}

              {activeTab === "projects" &&
                isOwnProfile &&
                (projects.length === 0 ? (
                  <div
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      color: "rgba(255, 255, 255, 0.3)",
                      fontSize: 13,
                    }}
                  >
                    No projects yet
                  </div>
                ) : (
                  projects.map((project) => (
                    <ProfileProjectRow
                      key={project.id}
                      project={project}
                      onClick={() => handleProjectClick(project)}
                    />
                  ))
                ))}
            </div>
          </RSC>
        </div>
      </div>
    </View>
  );
}

function ProfileProjectRow({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const createdDate = project.projectDetail.createdDate
    ? new Date(project.projectDetail.createdDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {project.projectDetail.albumArtSrc ? (
        <img
          src={project.projectDetail.albumArtSrc}
          alt=""
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            objectFit: "cover",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {project.projectDetail.name}
        </div>
        {createdDate && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.3)",
              marginTop: 2,
            }}
          >
            {createdDate}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.25)",
          flexShrink: 0,
        }}
      >
        {project.projectDetail.editingMode === "free" ? "Free" : "Static"}
      </div>
    </motion.div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        borderBottom: `2px solid ${active ? "rgba(255, 255, 255, 0.6)" : "transparent"}`,
        color: active ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.35)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 1,
        textTransform: "uppercase",
        padding: "10px 16px",
        cursor: "pointer",
        transition: "color 0.1s, border-color 0.1s",
      }}
    >
      {label}
      <span style={{ fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>
        {count}
      </span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "rgba(255, 255, 255, 0.55)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 4px",
        transition: "color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}
