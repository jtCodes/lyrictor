import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import LyrictorLoadingIndicator from "./components/LyrictorLoadingIndicator";
import ProjectCard from "./Project/ProjectCard";
import { Project } from "./Project/types";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  loadProjects,
  resetProjectEditorState,
  useProjectStore,
} from "./Project/store";
import { useNavigate } from "react-router-dom";
import FeaturedProject from "./Project/Featured/FeaturedProject";
import { useIsFullscreen, useWindowSize } from "./utils";
import RSC from "react-scrollbars-custom";
import { useAudioPlayer } from "./Project/usePreparedAudioPlayer";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { motion } from "framer-motion";
import ProfileButton from "./Auth/ProfileButton";
import { useAuthStore } from "./Auth/store";
import { signInWithGoogle } from "./Auth/signIn";
import { loadProjectsFromFirestore, loadPublishedProjects } from "./Project/firestoreProjectService";
import FilterPill, { ProjectFilter } from "./Project/FilterPill";
import ProjectInfoSection from "./Project/ProjectInfoSection";
import { useProjectOpenGuard } from "./Project/useProjectOpenGuard";
import ProjectAmbientBackground from "./components/ProjectAmbientBackground";
import { getHomepageLayout, getPortraitProjectListStyle, isPhoneLandscape, phoneLandscapeStyles } from "./Homepage/layout";
import { useDocumentTitle } from "./useDocumentTitle";

const HOMEPAGE_PROJECT_CARD_WIDTH = 340;
const HOMEPAGE_PROJECT_CARD_GAP = 32;
const HOMEPAGE_PROJECT_CARD_SIDE_PADDING = 20;
const HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING = 12;
const HOMEPAGE_LAYOUT_HYSTERESIS = 48;
const HOMEPAGE_FILTER_PILL_CLEARANCE = 56;
const HOMEPAGE_FILTER_PILL_TOP_OFFSET = 10;
const HOMEPAGE_DESKTOP_CONTENT_TOP_INSET = 56;
const HOMEPAGE_DESKTOP_INFO_SECTION_HEIGHT = 182;
const HOMEPAGE_DESKTOP_RAIL_SECTION_GAP = 18;
const HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH = 350;
const HOMEPAGE_DESKTOP_LIST_INNER_TOP_PADDING = 0;
const HOMEPAGE_DESKTOP_LIST_SCROLLBAR_TOP_OFFSET = 36;
const PROJECT_LIST_EDGE_MASK = `linear-gradient(to bottom,
  transparent 0px,
  rgba(0,0,0,0.156) calc(var(--list-fade-top, 0px) * 0.25),
  rgba(0,0,0,0.5) calc(var(--list-fade-top, 0px) * 0.5),
  rgba(0,0,0,0.844) calc(var(--list-fade-top, 0px) * 0.75),
  black var(--list-fade-top, 0px),
  black calc(100% - var(--list-fade-bottom, 0px)),
  rgba(0,0,0,0.844) calc(100% - var(--list-fade-bottom, 0px) * 0.75),
  rgba(0,0,0,0.5) calc(100% - var(--list-fade-bottom, 0px) * 0.5),
  rgba(0,0,0,0.156) calc(100% - var(--list-fade-bottom, 0px) * 0.25),
  transparent 100%)`;
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

function matchesProjectDetail(project: Project, projectDetail: Project["projectDetail"]) {
  return (
    project.projectDetail.name === projectDetail.name &&
    project.projectDetail.audioFileUrl === projectDetail.audioFileUrl
  );
}

export default function Homepage() {
  useDocumentTitle();

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
  const authReady = useAuthStore((state) => state.authReady);
  const authUsername = useAuthStore((state) => state.username);
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const editingProject = useProjectStore((state) => state.editingProject);
  const editingProjectId = useProjectStore((state) => state.editingProjectId);
  const [filter, setFilter] = useState<ProjectFilter>("discover");
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState("");
  const [isDiscoverSearchOpen, setIsDiscoverSearchOpen] = useState(false);
  const projectListScrollerRef = useRef<HTMLElement | null>(null);
  const updateProjectListMask = useCallback(({ scrollTop, scrollHeight, clientHeight }: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => {
    const scroller = projectListScrollerRef.current;
    if (!scroller) return;
    const fadeSize = Math.min(40, clientHeight / 4);
    // Grow the fade with the scroll distance, without rerendering every card.
    const top = Math.min(fadeSize, Math.max(0, scrollTop));
    const bottom = Math.min(fadeSize, Math.max(0, scrollHeight - clientHeight - scrollTop));
    scroller.style.setProperty("--list-fade-top", `${top}px`);
    scroller.style.setProperty("--list-fade-bottom", `${bottom}px`);
  }, []);
  const bindMobileProjectListScroller = useCallback((scroller: HTMLDivElement | null) => {
    if (!scroller) return;
    projectListScrollerRef.current = scroller;
    const update = () => updateProjectListMask(scroller);
    // Refresh edge fades on initial mount, viewport changes and loaded content,
    // as well as scrolling. Short/empty lists should not fade unnecessarily.
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    update();
    return () => {
      observer.disconnect();
      if (projectListScrollerRef.current === scroller) projectListScrollerRef.current = null;
    };
  }, [updateProjectListMask]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [mineLoading, setMineLoading] = useState(true);
  const [mineLoadError, setMineLoadError] = useState(false);
  const mineRequestKey = JSON.stringify([user?.uid ?? null, storagePreference]);
  const [settledMineRequestKey, setSettledMineRequestKey] = useState<string>();
  const isMineLoading = !authReady || mineLoading || settledMineRequestKey !== mineRequestKey;
  const projectFetchVersion = useRef(0);
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

    const normalizedQuery = discoverSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return sortProjectsByDiscoverDate(demoProjects);
    }

    return sortProjectsByDiscoverDate(
      demoProjects.filter((project) => {
        if (!(project as any).publishedAt) {
          return false;
        }

        const searchableFields = [
          project.projectDetail.name,
          project.projectDetail.songName,
          project.projectDetail.artistName,
          (project as any).username,
        ];

        return searchableFields.some((value) =>
          value?.toLowerCase().includes(normalizedQuery)
        );
      })
    );
  }, [demoProjects, discoverSearchQuery, filter, myProjects]);
  const initialFeaturedProject = useMemo(
    () => sortProjectsByDiscoverDate(demoProjects).find((project) => !project.projectDetail.isLocalUrl),
    [demoProjects]
  );
  const activeHomepageProject = useMemo(() => {
    if (!editingProject) {
      return undefined;
    }

    return (
      filteredProjects.find((project) => editingProjectId !== undefined ? project.id === editingProjectId : matchesProjectDetail(project, editingProject)) ??
      existingProjects.find((project) => editingProjectId !== undefined ? project.id === editingProjectId : matchesProjectDetail(project, editingProject))
    );
  }, [editingProject, editingProjectId, existingProjects, filteredProjects]);
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
  const phoneLandscape = isPhoneLandscape(windowWidth ?? 0, windowHeight ?? 0, navigator.userAgent);
  const landscapeStyles = phoneLandscape && !isFullScreen ? phoneLandscapeStyles : undefined;
  const {
    shouldUsePhoneHomepageLayout, shouldUseWideHomepageLayout, shouldUseDesktopPreviewBranch,
    desktopLayoutGap, effectiveDesktopProjectRailWidth, maxWidth, maxFeaturedHeight,
    effectiveProjectListHeight,
  } = getHomepageLayout({
    isFullScreen, usePhoneHomepageLayout, phoneLandscape, maxContentWidth, maxContentHeight,
  });
  const projectListBottomPadding = (user ? 72 : 28) + HOMEPAGE_FILTER_PILL_CLEARANCE;

  const handleBeforeProjectOpen = useCallback((project: Project) => {
    return canOpenProjectWithGuard(project.projectDetail);
  }, [canOpenProjectWithGuard]);

  const fetchProjects = useCallback(async () => {
    const version = ++projectFetchVersion.current;
    const isCurrent = () => projectFetchVersion.current === version;
    setMineLoading(true);
    setMineLoadError(false);
    let localProjects: Project[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("lyrictorProjects") ?? "[]");
      if (Array.isArray(parsed)) localProjects = parsed.map(project => ({ ...project, source: "local" as const }));
    } catch { /* Keep cloud projects available if local storage is malformed. */ }

    // Mine should not wait behind Discover's network requests.
    let mine = localProjects;
    let discover: Project[] = [];
    setMyProjects(mine);
    const commitCollections = () => {
      if (isCurrent()) setExistingProjects([...mine, ...discover]);
    };
    await Promise.all([
      (async () => {
        try {
          if (!authReady) return;
          const cloud = user && storagePreference === "cloud"
            ? await loadProjectsFromFirestore(user.uid) : [];
          if (!isCurrent()) return;
          mine = [...localProjects, ...cloud];
          setMyProjects(mine);
          commitCollections();
        } catch (error) {
          if (isCurrent()) {
            console.error("Failed to load Mine projects", error);
            setMineLoadError(true);
          }
        } finally {
          if (isCurrent() && authReady) {
            setSettledMineRequestKey(mineRequestKey);
            setMineLoading(false);
          }
        }
      })(),
      (async () => {
        try {
          const [demos, published] = await Promise.all([
            loadProjects(true),
            loadPublishedProjects().catch(() => [] as Project[]),
          ]);
          if (!isCurrent()) return;
          const seen = new Set(demos.map(project => project.id));
          discover = sortProjectsByDiscoverDate([...demos, ...published.filter(project => !seen.has(project.id))]);
          setDemoProjects(discover);
          commitCollections();
        } catch (error) {
          if (isCurrent()) console.error("Failed to load Discover projects", error);
        }
      })(),
    ]);
  }, [user, authReady, storagePreference, mineRequestKey, setExistingProjects]);

  const isMineEmpty = filter === "mine" && filteredProjects.length === 0;
  const isDiscoverSearchEmpty =
    filter === "discover" && discoverSearchQuery.trim().length > 0 && filteredProjects.length === 0;
  const shouldShowSignInCta = authReady && !user;
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
        width: shouldUseWideHomepageLayout || shouldUsePhoneHomepageLayout ? "100%" : HOMEPAGE_PROJECT_CARD_WIDTH,
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

  const mineStatus = filter === "mine" && (isMineLoading || mineLoadError) ? (
    <div role="status" className={isMineEmpty ? "lyrictor-loading-region" : undefined} style={{ padding: "24px 20px", color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
      <Flex direction="column" alignItems="center" justifyContent="center" gap="size-100">
        {isMineLoading ? <LyrictorLoadingIndicator /> : null}
        <span>{isMineLoading ? "Loading your projects…" : "Couldn't load your projects."}</span>
      </Flex>
      {mineLoadError && !isMineLoading ? <div style={{ marginTop: 12 }}><Button variant="secondary" onPress={() => { void fetchProjects(); }}>Retry</Button></div> : null}
    </div>
  ) : null;
  const projectItemsContent = isMineEmpty && mineStatus ? mineStatus : isMineEmpty ? (
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
  ) : isDiscoverSearchEmpty ? (
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
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255, 255, 255, 0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.35)",
        }}
      >
        No published projects found
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.22)",
          maxWidth: 260,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Try a different project name, song title, artist, or username.
      </span>
    </div>
  ) : shouldUseWideHomepageLayout || landscapeStyles ? (
    <Flex
      direction="row"
      wrap="wrap"
      gap={landscapeStyles ? "12px" : "size-400"}
      UNSAFE_style={{
        padding: "14px 12px 84px 0px",
        paddingBottom: projectListBottomPadding,
        paddingTop: 36,
        ...landscapeStyles?.cards,
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
      gap={shouldUsePhoneHomepageLayout ? "16px" : "size-400"}
      UNSAFE_style={{
        padding: shouldUsePhoneHomepageLayout
          ? "16px 6px 28px"
          : "18px 10px 28px",
        paddingBottom: projectListBottomPadding,
        paddingTop: shouldUsePhoneHomepageLayout ? 16 : 36,
        ...(shouldUsePhoneHomepageLayout ? getPortraitProjectListStyle(maxWidth) : undefined),
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
          fillAvailableWidth={shouldUsePhoneHomepageLayout}
        />
      ))}
      {signInCta}
    </Flex>
  );

  const projectsContent = (
    <div aria-busy={filter === "mine" && isMineLoading} style={isMineEmpty && mineStatus ? { width: "100%", height: "100%" } : undefined}>
      {!isMineEmpty ? mineStatus : null}
      {projectItemsContent}
    </div>
  );

  useEffect(() => {
    void fetchProjects();
    return () => { projectFetchVersion.current++; };
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

    resetProjectEditorState();
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
        }}
      >
        {isMineEmpty && mineStatus ? (
          projectsContent
        ) : shouldUsePhoneHomepageLayout ? (
          <div
            ref={bindMobileProjectListScroller}
            onScroll={(event) => updateProjectListMask(event.currentTarget)}
            style={{
              WebkitMaskImage: PROJECT_LIST_EDGE_MASK,
              maskImage: PROJECT_LIST_EDGE_MASK,
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
            onUpdate={updateProjectListMask}
            scrollerProps={{
              elementRef: (element) => { projectListScrollerRef.current = element; },
              style: {
                WebkitMaskImage: PROJECT_LIST_EDGE_MASK,
                maskImage: PROJECT_LIST_EDGE_MASK,
              },
            }}
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
      <FilterPill
        filter={filter}
        onFilterChange={(nextFilter) => {
          setFilter(nextFilter);

          if (nextFilter !== "discover") {
            setIsDiscoverSearchOpen(false);
            setDiscoverSearchQuery("");
          }
        }}
        isSearchOpen={isDiscoverSearchOpen}
        searchValue={discoverSearchQuery}
        onSearchOpen={() => {
          setFilter("discover");
          setIsDiscoverSearchOpen(true);
        }}
        onSearchClose={() => {
          setIsDiscoverSearchOpen(false);
          setDiscoverSearchQuery("");
        }}
        onSearchChange={setDiscoverSearchQuery}
      />
    </div>
  );

  return (
    <View
      backgroundColor={"gray-50"}
      position="relative"
      overflow="hidden"
      UNSAFE_className="homepage"
    >
      {!isFullScreen ? <ProjectAmbientBackground /> : null}
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
            ? (landscapeStyles ? ["44px", "minmax(0, 1fr)"] : ["size-700", "auto"])
            : ["size-900", "auto", "size-1000"]
        }
        height={viewportHeight}
        gap={shouldUsePhoneHomepageLayout ? "size-100" : "size-75"}
        UNSAFE_style={{ position: "relative", zIndex: 1, ...landscapeStyles?.grid }}
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
              ...landscapeStyles?.header,
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
                    ...landscapeStyles?.preview,
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
