import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { Project } from "./Project/types";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { loadProjects, useProjectStore } from "./Project/store";
import { useNavigate } from "react-router-dom";
import FeaturedProject from "./Project/Featured/FeaturedProject";
import { useIsFullscreen, useWindowSize } from "./utils";
import RSC from "react-scrollbars-custom";
import { useAudioPlayer } from "react-use-audio-player";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { motion } from "framer-motion";
import ProfileButton from "./Auth/ProfileButton";
import { useAuthStore } from "./Auth/store";
import { signInWithGoogle } from "./Auth/signIn";
import { loadProjectsFromFirestore, loadPublishedProjects } from "./Project/firestoreProjectService";
import FilterPill, { ProjectFilter } from "./Project/FilterPill";
import ProjectInfoSection from "./Project/ProjectInfoSection";
import { useProjectOpenGuard } from "./Project/useProjectOpenGuard";
import ImmersiveLyricPreview from "./components/ImmersiveLyricPreview";

const HOMEPAGE_PROJECT_CARD_WIDTH = 340;
const HOMEPAGE_PROJECT_CARD_GAP = 32;
const HOMEPAGE_PROJECT_CARD_SIDE_PADDING = 20;
const HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING = 12;
const HOMEPAGE_LAYOUT_HYSTERESIS = 48;
const HOMEPAGE_FILTER_PILL_CLEARANCE = 56;
const HOMEPAGE_FEATURED_INFO_HEIGHT = 156;
const HOMEPAGE_DESKTOP_LAYOUT_GAP = 40;
const HOMEPAGE_FILTER_PILL_TOP_OFFSET = 10;
const HOMEPAGE_DESKTOP_CONTENT_TOP_INSET = 56;
const HOMEPAGE_DESKTOP_INFO_SECTION_HEIGHT = 182;
const HOMEPAGE_DESKTOP_RAIL_SECTION_GAP = 18;
const HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH = 350;
const HOMEPAGE_DESKTOP_LIST_INNER_TOP_PADDING = 0;
const HOMEPAGE_DESKTOP_LIST_SCROLLBAR_TOP_OFFSET = 36;
const HOMEPAGE_TWO_CARD_MIN_WIDTH =
  HOMEPAGE_PROJECT_CARD_WIDTH * 2 +
  HOMEPAGE_PROJECT_CARD_GAP +
  HOMEPAGE_PROJECT_CARD_SIDE_PADDING * 2;

function getProjectDiscoverSortTime(project: Project) {
  const updatedTime = project.projectDetail.updatedDate
    ? new Date(project.projectDetail.updatedDate).getTime()
    : Number.NaN;
  const createdTime = new Date(project.projectDetail.createdDate).getTime();
  const publishedTime = new Date((project as any).publishedAt ?? 0).getTime();
  return Math.max(
    Number.isFinite(updatedTime) ? updatedTime : 0,
    Number.isFinite(createdTime) ? createdTime : 0,
    Number.isFinite(publishedTime) ? publishedTime : 0
  );
}

function sortProjectsByDiscoverDate(projects: Project[]) {
  return [...projects].sort(
    (left, right) => getProjectDiscoverSortTime(right) - getProjectDiscoverSortTime(left)
  );
}

export default function Homepage() {
  const { ready, pause } = useAudioPlayer();
  const isFullScreen = useIsFullscreen();
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const contentRef = useRef(null);
  const [maxContentWidth, setMaxContentWidth] = useState(windowWidth);
  const [maxContentHeight, setMaxContentHeight] = useState(windowHeight);

  const existingProjects = useProjectStore((state) => state.existingProjects);
  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );

  const user = useAuthStore((state) => state.user);
  const authUsername = useAuthStore((state) => state.username);
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const editingProject = useProjectStore((state) => state.editingProject);
  const [filter, setFilter] = useState<ProjectFilter>("discover");
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [demoProjects, setDemoProjects] = useState<Project[]>([]);
  const { canOpenProject: canOpenProjectWithGuard, desktopAppRequiredPopup } =
    useProjectOpenGuard();

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setEditingProjectAccess = useProjectStore((state) => state.setEditingProjectAccess);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setIsCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );

  const navigate = useNavigate();
  const homepageLayoutMeasureWidth = maxContentWidth ?? windowWidth ?? 0;
  const [usePhoneHomepageLayout, setUsePhoneHomepageLayout] = useState(
    () => homepageLayoutMeasureWidth < HOMEPAGE_TWO_CARD_MIN_WIDTH
  );

  const immersiveBackgroundHeight = Math.max(
    320,
    Math.min((windowHeight ?? 0) * 0.56, 560)
  );

  useEffect(() => {
    if (isFullScreen) {
      return;
    }

    setUsePhoneHomepageLayout((currentValue) => {
      const shouldStayInPhoneLayout =
        homepageLayoutMeasureWidth < HOMEPAGE_TWO_CARD_MIN_WIDTH + HOMEPAGE_LAYOUT_HYSTERESIS;
      const nextValue = currentValue
        ? shouldStayInPhoneLayout
        : homepageLayoutMeasureWidth < HOMEPAGE_TWO_CARD_MIN_WIDTH;

      return nextValue;
    });
  }, [homepageLayoutMeasureWidth, isFullScreen]);

  const filteredProjects = useMemo(() => {
    if (filter === "mine") {
      return sortProjectsByDiscoverDate(myProjects);
    }

    return sortProjectsByDiscoverDate(demoProjects);
  }, [demoProjects, filter, myProjects]);
  const initialFeaturedProject = useMemo(
    () => sortProjectsByDiscoverDate(demoProjects).find((project) => !project.projectDetail.isLocalUrl),
    [demoProjects]
  );
  const activeHomepageProject = useMemo(() => {
    if (!editingProject) {
      return undefined;
    }

    return existingProjects.find((project) => {
      return (
        project.projectDetail.name === editingProject.name &&
        project.projectDetail.audioFileUrl === editingProject.audioFileUrl
      );
    });
  }, [editingProject, existingProjects]);
  const activeHomepageProjectOwnerUsername = useMemo(() => {
    if (!activeHomepageProject) {
      return undefined;
    }

    const isPublished = Boolean((activeHomepageProject as any).publishedAt);
    const hasDemoInName = activeHomepageProject.projectDetail.name.includes("(Demo)");
    const isOwnProject = Boolean(
      user && (
        (activeHomepageProject as any).uid === user.uid ||
        (!isPublished && !hasDemoInName && activeHomepageProject.source !== "demo")
      )
    );

    return (activeHomepageProject as any).username || (isOwnProject ? authUsername : undefined);
  }, [activeHomepageProject, authUsername, user]);
  const shouldUsePhoneHomepageLayout = Boolean(
    !isFullScreen && usePhoneHomepageLayout
  );
  const shouldUseWideHomepageLayout = Boolean(
    !shouldUsePhoneHomepageLayout &&
      !isFullScreen
  );
  const shouldUseDesktopPreviewBranch = !usePhoneHomepageLayout;
  const desktopLayoutGap = shouldUseWideHomepageLayout ? HOMEPAGE_DESKTOP_LAYOUT_GAP : 0;
  const desktopPreviewAvailableHeight = shouldUseWideHomepageLayout
    ? Math.max((maxContentHeight ?? 0) - HOMEPAGE_FEATURED_INFO_HEIGHT, 220)
    : (maxContentHeight ?? 0);
  const desktopPreviewMaxWidthByHeight = shouldUseWideHomepageLayout
    ? (desktopPreviewAvailableHeight * 16) / 9
    : 0;
  const phonePreviewAvailableWidth = Math.max(
    (maxContentWidth ?? 0) - HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING * 2,
    280
  );
  const featuredContentWidth = shouldUseWideHomepageLayout
    ? Math.max(
        Math.min(
          desktopPreviewMaxWidthByHeight,
          (maxContentWidth ?? 0) - HOMEPAGE_PROJECT_CARD_WIDTH - desktopLayoutGap
        ),
        320
      )
    : shouldUsePhoneHomepageLayout
      ? phonePreviewAvailableWidth
      : (maxContentWidth ?? 0);
  const featuredContentHeight = shouldUseWideHomepageLayout
    ? desktopPreviewAvailableHeight
    : (maxContentHeight ?? 0);
  const desktopProjectRailWidth = shouldUseWideHomepageLayout
    ? Math.max(
        HOMEPAGE_PROJECT_CARD_WIDTH,
        (maxContentWidth ?? 0) - featuredContentWidth - desktopLayoutGap
      )
    : 0;
  const effectiveDesktopProjectRailWidth = shouldUseWideHomepageLayout
    ? Math.min(desktopProjectRailWidth, HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH)
    : desktopProjectRailWidth;
  const { maxWidth, maxHeight: maxFeaturedHeight } = useMemo(() => {
    return calculate16by9Size(
      featuredContentHeight,
      featuredContentWidth,
      shouldUseWideHomepageLayout ? 1 : undefined,
      shouldUsePhoneHomepageLayout
    );
  }, [
    featuredContentHeight,
    featuredContentWidth,
    shouldUseWideHomepageLayout,
    shouldUsePhoneHomepageLayout,
  ]);
  const projectListHeight = Math.max(
    220,
    (maxContentHeight ?? 0) - maxFeaturedHeight - (shouldUsePhoneHomepageLayout ? 24 : 60)
  );
  const effectiveProjectListHeight = shouldUseWideHomepageLayout
    ? Math.max((maxContentHeight ?? 0) - 12, 320)
    : projectListHeight;
  const projectListBottomPadding = (user ? 72 : 28) + HOMEPAGE_FILTER_PILL_CLEARANCE;

  const handleBeforeProjectOpen = useCallback((project: Project) => {
    return canOpenProjectWithGuard(project.projectDetail);
  }, [canOpenProjectWithGuard]);

  const fetchProjects = useCallback(async () => {
    const demos = await loadProjects(true);

    let localProjects: Project[] = [];
    const existingLocalProjects = localStorage.getItem("lyrictorProjects");
    if (existingLocalProjects) {
      try {
        const parsedProjects = JSON.parse(existingLocalProjects) as Project[];
        localProjects = parsedProjects.map((project) => ({
          ...project,
          source: "local" as const,
        }));
      } catch {
        localProjects = [];
      }
    }

    // Load user-published projects from Firestore
    let published: Project[] = [];
    try {
      published = await loadPublishedProjects();
    } catch {}

    // Merge demos + published, dedup by id
    const seen = new Set(demos.map((d) => d.id));
    const merged = sortProjectsByDiscoverDate([
      ...demos,
      ...published.filter((p) => !seen.has(p.id)),
    ]);

    setDemoProjects(merged);
    setExistingProjects([...localProjects, ...merged]);

    if (user && storagePreference === "cloud") {
      const mine = await loadProjectsFromFirestore(user.uid);
      setMyProjects([...localProjects, ...mine]);
      setExistingProjects([...localProjects, ...mine, ...merged]);
      return;
    }

    setMyProjects(localProjects);
  }, [user, storagePreference]);

  const isMineEmpty = filter === "mine" && filteredProjects.length === 0;
  const shouldShowSignInCta = !user;
  const signInCtaTitle = filter === "discover"
    ? "Sign in to publish your work"
    : "Sign in to sync your projects";
  const signInCtaDescription = filter === "discover"
    ? "Publish your own projects so other people can discover them here, while your local projects stay exactly where they are."
    : "Your local projects stay here for now, but local-only work is easier to lose. Signing in adds cloud sync and gives your Mine list a safer home.";

  const handleSignInCtaClick = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("Sign-in error:", error);
      }
    }
  }, []);

  const signInCta = shouldShowSignInCta ? (
    <button
      type="button"
      onClick={() => {
        void handleSignInCtaClick();
      }}
      style={{
        width: shouldUseWideHomepageLayout ? "100%" : HOMEPAGE_PROJECT_CARD_WIDTH,
        minHeight: 208,
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        background:
          "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(18, 20, 24, 0.42) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        color: "rgba(255, 255, 255, 0.9)",
        cursor: "pointer",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        textAlign: "left",
        transition: "transform 0.12s ease-out, border-color 0.12s ease-out, background 0.12s ease-out",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-1px)";
        event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          background: "rgba(255, 255, 255, 0.06)",
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.01,
            color: "rgba(255, 255, 255, 0.92)",
          }}
        >
          {signInCtaTitle}
        </span>
        <span
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: "rgba(255, 255, 255, 0.5)",
            maxWidth: shouldUseWideHomepageLayout ? "100%" : 250,
          }}
        >
          {signInCtaDescription}
        </span>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.08,
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        Sign in with Google
      </span>
    </button>
  ) : null;

  const projectsContent = isMineEmpty ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        gap: 12,
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.35)",
        }}
      >
        No projects yet
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.22)",
          maxWidth: 240,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Create your first project to get started
      </span>
      {signInCta ? (
        <div style={{ paddingTop: 12 }}>
          {signInCta}
        </div>
      ) : null}
    </div>
  ) : shouldUseWideHomepageLayout ? (
    <Flex
      direction="row"
      wrap="wrap"
      gap="size-400"
      UNSAFE_style={{
        padding: "14px 12px 84px 0px",
        paddingBottom: projectListBottomPadding,
        paddingTop: 36,
      }}
      justifyContent="center"
      alignItems="start"
    >
      {filteredProjects.map((p) => (
        <ProjectCard
          project={p}
          key={p.id}
          canDelete={filter === "mine"}
          onPublishChange={fetchProjects}
          onBeforeProjectOpen={handleBeforeProjectOpen}
          fillAvailableWidth={true}
        />
      ))}
      {signInCta}
    </Flex>
  ) : (
    <Flex
      direction="row"
      wrap="wrap"
      gap="size-400"
      UNSAFE_style={{
        padding: shouldUsePhoneHomepageLayout
          ? "16px 6px 28px"
          : "18px 10px 28px",
        paddingBottom: projectListBottomPadding,
        paddingTop: shouldUsePhoneHomepageLayout ? 16 : 36,
      }}
      justifyContent="center"
      alignItems="center"
    >
      {filteredProjects.map((p) => (
        <ProjectCard
          project={p}
          key={p.id}
          canDelete={filter === "mine"}
          onPublishChange={fetchProjects}
          onBeforeProjectOpen={handleBeforeProjectOpen}
        />
      ))}
      {signInCta}
    </Flex>
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!contentRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!isFullScreen) {
        const current = contentRef.current as any;
        setMaxContentWidth(current.offsetWidth);
        setMaxContentHeight(current.offsetHeight);
      }
    });
    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, [contentRef.current, isFullScreen]);

  function handleOnCreateClick() {
    if (ready) {
      pause();
    }

    setEditingProject(undefined);
    setEditingProjectAccess(undefined);
    setLyricReference(undefined);
    setLyricTexts([]);
    setIsCreateNewProjectPopupOpen(true);

    navigate(`/edit`);
  }

  const featuredProjectWidth = isFullScreen ? windowWidth! : maxWidth;
  const featuredProjectHeight = isFullScreen ? windowHeight! : maxFeaturedHeight;
  const viewportHeight = windowHeight ? `${Math.round(windowHeight)}px` : "100vh";
  const desktopProjectInfoSection = shouldUseWideHomepageLayout && editingProject ? (
    <div
      style={{
        width: "100%",
        paddingTop: HOMEPAGE_DESKTOP_CONTENT_TOP_INSET,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: HOMEPAGE_DESKTOP_INFO_SECTION_HEIGHT,
          minHeight: HOMEPAGE_DESKTOP_INFO_SECTION_HEIGHT,
        }}
      >
        <div style={{ width: "100%", height: "100%", paddingRight: 14, boxSizing: "border-box" }}>
          <ProjectInfoSection
            project={activeHomepageProject}
            projectDetail={editingProject}
            width="100%"
            compact={true}
            eyebrowLabel="Featured preview"
            ownerUsername={activeHomepageProjectOwnerUsername}
            truncateText={true}
            hiddenRows={["length"]}
          />
        </div>
      </div>
    </div>
  ) : null;
  const projectListSection = (
    <div
      className="project-list-container"
      style={{
        position: "relative",
        minWidth: 0,
        height: effectiveProjectListHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: shouldUseWideHomepageLayout ? "center" : undefined,
        gap: shouldUseWideHomepageLayout ? HOMEPAGE_DESKTOP_RAIL_SECTION_GAP : 0,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: shouldUseWideHomepageLayout
            ? HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH
            : undefined,
        }}
      >
        {desktopProjectInfoSection}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: shouldUseWideHomepageLayout
            ? HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH
            : undefined,
          height: shouldUsePhoneHomepageLayout ? effectiveProjectListHeight : undefined,
          flex: shouldUsePhoneHomepageLayout ? undefined : 1,
          minHeight: 0,
          WebkitMaskImage: !shouldUsePhoneHomepageLayout
            ? shouldUseWideHomepageLayout
              ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.24) 4%, rgba(0,0,0,0.6) 8%, black 14%, black 88%, rgba(0,0,0,0.6) 94%, rgba(0,0,0,0.24) 98%, transparent 100%)"
              : "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 3%, rgba(0,0,0,0.7) 6%, black 12%, black 88%, rgba(0,0,0,0.7) 94%, rgba(0,0,0,0.3) 97%, transparent 100%)"
            : undefined,
          maskImage: !shouldUsePhoneHomepageLayout
            ? shouldUseWideHomepageLayout
              ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.24) 4%, rgba(0,0,0,0.6) 8%, black 14%, black 88%, rgba(0,0,0,0.6) 94%, rgba(0,0,0,0.24) 98%, transparent 100%)"
              : "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 3%, rgba(0,0,0,0.7) 6%, black 12%, black 88%, rgba(0,0,0,0.7) 94%, rgba(0,0,0,0.3) 97%, transparent 100%)"
            : undefined,
        }}
      >
        {shouldUsePhoneHomepageLayout ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorY: "contain",
              touchAction: "pan-y",
              boxSizing: "border-box",
              paddingTop: 0,
              paddingBottom: projectListBottomPadding,
            }}
          >
            {projectsContent}
          </div>
        ) : (
          <RSC
            id="RSC-Example"
            style={{
              width: "100%",
              height: "100%",
            }}
            trackYProps={{
              style: {
                width: 8,
                top: shouldUseWideHomepageLayout
                  ? HOMEPAGE_DESKTOP_LIST_SCROLLBAR_TOP_OFFSET
                  : 36,
                bottom: 28,
                borderRadius: 3,
                background: "rgba(255,255,255,0.04)",
              },
            }}
            thumbYProps={{
              style: {
                borderRadius: 3,
                background: "rgba(255,255,255,0.14)",
              },
            }}
          >
            <div
              style={{
                paddingTop: shouldUseWideHomepageLayout
                  ? desktopProjectInfoSection
                      ? HOMEPAGE_DESKTOP_LIST_INNER_TOP_PADDING
                    : HOMEPAGE_DESKTOP_CONTENT_TOP_INSET
                  : 0,
              }}
            >
              {projectsContent}
            </div>
          </RSC>
        )}
      </div>
      <FilterPill filter={filter} onFilterChange={setFilter} />
    </div>
  );

  return (
    <View
      backgroundColor={"gray-50"}
      position="relative"
      overflow="hidden"
    >
      {!isFullScreen ? (
        <ImmersiveHomepageBackground
          height={immersiveBackgroundHeight}
          width={Math.max(windowWidth ?? 0, 1)}
          isWideLayout={shouldUseWideHomepageLayout}
        />
      ) : null}
      <Grid
        areas={
          shouldUsePhoneHomepageLayout
            ? ["header", "content"]
            : [
                "header  header  header",
                "sidebar content rightSidebar",
                "footer  footer  footer",
              ]
        }
        columns={
          shouldUsePhoneHomepageLayout
            ? ["1fr"]
            : ["clamp(12px, 2vw, 28px)", "minmax(0, 1fr)", "clamp(12px, 2vw, 28px)"]
        }
        rows={
          shouldUsePhoneHomepageLayout
            ? ["size-700", "auto"]
            : ["size-900", "auto", "size-1000"]
        }
        height={viewportHeight}
        gap={shouldUsePhoneHomepageLayout ? "size-100" : "size-75"}
        UNSAFE_style={{ position: "relative", zIndex: 1 }}
      >
        <View gridArea="header" position="relative">
          <Flex
            justifyContent={"space-between"}
            alignItems={"start"}
            height={"100%"}
            UNSAFE_style={{
              paddingLeft: shouldUsePhoneHomepageLayout ? 18 : 16,
              paddingRight: shouldUsePhoneHomepageLayout ? 16 : 12,
              paddingTop: shouldUsePhoneHomepageLayout ? 12 : 8,
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center" }}>
              <Header>
                <div style={{ display: "inline-block" }}>
                  <Text
                    UNSAFE_style={{
                      fontSize: shouldUsePhoneHomepageLayout ? 24 : 26,
                      fontWeight: "800",
                      letterSpacing: shouldUsePhoneHomepageLayout ? 1.5 : 2,
                      opacity: 0.80,
                      color: "transparent",
                      backgroundImage:
                        "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.94) 24%, rgba(255,244,209,0.88) 48%, rgba(255,255,255,0.94) 72%, rgba(255,255,255,0.6) 100%)",
                      backgroundSize: "220% 100%",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                    }}
                  >
                    <span
                      style={{
                        fontSize: shouldUsePhoneHomepageLayout ? "1.1em" : "1.12em",
                        display: "inline-block",
                        backgroundImage:
                          "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.94) 24%, rgba(255,244,209,0.88) 48%, rgba(255,255,255,0.94) 72%, rgba(255,255,255,0.6) 100%)",
                        backgroundSize: "220% 100%",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      Lyrictor
                    </span>
                  </Text>
                </div>
              </Header>
            </div>
            <ProfileButton />
          </Flex>
        </View>
        {!shouldUsePhoneHomepageLayout && <View gridArea="sidebar" />}
        <div
          ref={contentRef}
          style={{ gridArea: "content", overflow: "hidden" }}
        >
          {shouldUseDesktopPreviewBranch ? (
            <div
              style={
                isFullScreen
                  ? {
                      position: "fixed",
                      inset: 0,
                      zIndex: 100,
                      backgroundColor: "var(--spectrum-global-color-gray-50)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }
                  : {
                      display: "flex",
                      justifyContent: "center",
                      height: "100%",
                      width: "100%",
                    }
              }
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isFullScreen
                    ? `${featuredProjectWidth}px`
                    : `${featuredProjectWidth}px minmax(0, ${effectiveDesktopProjectRailWidth}px)`,
                  columnGap: isFullScreen ? 0 : desktopLayoutGap,
                  alignItems: isFullScreen ? "center" : "start",
                  height: "100%",
                  width: isFullScreen
                    ? featuredProjectWidth
                    : featuredProjectWidth + effectiveDesktopProjectRailWidth + desktopLayoutGap,
                  maxWidth: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    paddingTop: isFullScreen ? 0 : HOMEPAGE_FILTER_PILL_TOP_OFFSET,
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ width: featuredProjectWidth, maxWidth: "100%" }}>
                    <FeaturedProject
                      maxWidth={featuredProjectWidth}
                      maxHeight={featuredProjectHeight}
                      initialProject={initialFeaturedProject}
                    />
                  </div>
                </div>
                {!isFullScreen ? projectListSection : null}
              </div>
            </div>
          ) : (
            <>
              <div
                style={
                  isFullScreen
                    ? {
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        backgroundColor: "var(--spectrum-global-color-gray-50)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }
                    : undefined
                }
              >
                <Flex
                  justifyContent={"center"}
                  marginBottom={
                    isFullScreen ? undefined : (shouldUsePhoneHomepageLayout ? "12px" : "25px")
                  }
                  marginTop={
                    isFullScreen ? undefined : (shouldUsePhoneHomepageLayout ? "4px" : "25px")
                  }
                  UNSAFE_style={
                    shouldUsePhoneHomepageLayout
                      ? {
                          width: "100%",
                          paddingLeft: HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING,
                          paddingRight: HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING,
                          boxSizing: "border-box",
                        }
                      : undefined
                  }
                >
                  <FeaturedProject
                    maxWidth={featuredProjectWidth}
                    maxHeight={featuredProjectHeight}
                    initialProject={initialFeaturedProject}
                  />
                </Flex>
              </div>
              {projectListSection}
            </>
          )}
        </div>
        {!shouldUsePhoneHomepageLayout && <View gridArea="rightSidebar" />}
        {!shouldUsePhoneHomepageLayout ? (
          <View gridArea="footer">
            <Flex justifyContent="center" alignItems="center" height="100%">
              <motion.div
                whileHover={{
                  y: -1,
                  scale: 1.02,
                  filter: "brightness(1.06)",
                }}
                whileTap={{
                  y: 1,
                  scale: 0.975,
                  filter: "brightness(0.96)",
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                style={{ borderRadius: 999 }}
              >
                <Button
                  variant={"secondary"}
                  onPress={handleOnCreateClick}
                  UNSAFE_style={{
                    minWidth: 136,
                    minHeight: 40,
                    borderRadius: 999,
                    padding: "0 16px",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(40px) saturate(1.8)",
                    WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "rgba(255, 255, 255, 0.95)",
                    boxShadow:
                      "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.2)",
                    fontWeight: 600,
                    letterSpacing: 0.2,
                    cursor: "pointer",
                  }}
                >
                  <Flex alignItems="center" gap="size-100">
                    <AddCircle size="S" />
                    <Text>Create</Text>
                  </Flex>
                </Button>
              </motion.div>
            </Flex>
          </View>
        ) : null}
      </Grid>
      {desktopAppRequiredPopup}
    </View>
  );
}

function ImmersiveHomepageBackground({
  width,
  height,
  isWideLayout,
}: {
  width: number;
  height: number;
  isWideLayout: boolean;
}) {
  const previewMask = isWideLayout
    ? "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)"
    : "radial-gradient(ellipse at center 16%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 34%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.2) 78%, transparent 100%), linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.9) 24%, rgba(0,0,0,0.56) 56%, rgba(0,0,0,0.18) 78%, transparent 100%)";
  const overlayGradient = isWideLayout
    ? undefined
    : "linear-gradient(180deg, rgba(4, 5, 7, 0.16) 0%, rgba(6, 7, 9, 0.06) 22%, rgba(4, 5, 7, 0.34) 54%, rgba(0, 0, 0, 0.86) 100%)";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: isWideLayout ? "50%" : -290,
          left: "50%",
          width,
          height,
          transform: isWideLayout
            ? "translate(-50%, -50%) scale(2.5)"
            : "translateX(-50%) scale(2.18)",
          transformOrigin: isWideLayout ? "center center" : "center top",
          opacity: isWideLayout ? 0.35 : 0.38,
          filter: isWideLayout ? "blur(80px) saturate(1.1)" : "blur(70px) saturate(1.05)",
          willChange: "transform, opacity",
          WebkitMaskImage: previewMask,
          maskImage: previewMask,
        }}
      >
        <ImmersiveLyricPreview maxWidth={width} maxHeight={height} />
      </div>
      {overlayGradient ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: overlayGradient,
          }}
        />
      ) : null}
    </div>
  );
}

function calculate16by9Size(
  windowHeight: number,
  windowWidth: number,
  heightFactor?: number,
  usePhoneHomepageLayout?: boolean
) {
  const effectiveHeightFactor = heightFactor ?? (usePhoneHomepageLayout ? 0.62 : 0.4);
  const maxHeight = windowHeight * effectiveHeightFactor;
  const maxWidth = (maxHeight * 16) / 9;

  if (maxWidth > windowWidth) {
    const adjustedHeight = (windowWidth * 9) / 16;
    return {
      maxWidth: windowWidth,
      maxHeight: adjustedHeight,
    };
  }

  return {
    maxWidth,
    maxHeight,
  };
}
