import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useEffect, useRef, useState, useMemo } from "react";
import { loadProjects, useProjectStore } from "./Project/store";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import FeaturedProject from "./Project/Featured/FeaturedProject";
import { isMobile, useIsFullscreen, useWindowSize } from "./utils";
import RSC from "react-scrollbars-custom";
import { useAudioPlayer } from "react-use-audio-player";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { motion } from "framer-motion";
import LyricPreview from "./Editor/Lyrics/LyricPreview/LyricPreview";

export default function Homepage() {
  const { ready, pause } = useAudioPlayer();
  const isFullScreen = useIsFullscreen();
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const contentRef = useRef(null);
  const [maxContentWidth, setMaxContentWidth] = useState(windowWidth);
  const [maxContentHeight, setMaxContentHeight] = useState(windowHeight);
  const { maxWidth, maxHeight: maxFeaturedHeight } = useMemo(() => {
    return calculate16by9Size(maxContentHeight ?? 0, maxContentWidth ?? 0);
  }, [maxContentHeight, maxContentWidth]);

  const existingProjects = useProjectStore((state) => state.existingProjects);
  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );

  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setIsCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );

  const navigate = useNavigate();

  const projectListHeight = Math.max(
    220,
    (maxContentHeight ?? 0) - maxFeaturedHeight - (isMobile ? 24 : 60)
  );
  const immersiveBackgroundHeight = Math.max(
    320,
    Math.min((windowHeight ?? 0) * 0.56, 560)
  );

  const projectsContent = (
    <Flex
      direction="row"
      wrap="wrap"
      gap="size-400"
      UNSAFE_style={{
        padding: isMobile ? "16px 6px 28px" : "18px 10px 28px",
        paddingTop: isMobile ? 16 : 36,
      }}
      justifyContent="center"
      alignItems="center"
    >
      {existingProjects.map((p) => (
        <ProjectCard project={p} key={p.id} />
      ))}
    </Flex>
  );

  useEffect(() => {
    const fetchProjects = async () => {
      const projects = await loadProjects(true);
      setExistingProjects(projects);
    };

    fetchProjects();
  }, []);

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
    setLyricReference(undefined);
    setLyricTexts([]);
    setIsCreateNewProjectPopupOpen(true);

    navigate(`/edit`);
  }

  const featuredProjectWidth = isFullScreen ? windowWidth! : maxWidth;
  const featuredProjectHeight = isFullScreen ? windowHeight! : maxFeaturedHeight;

  return (
    <View
      backgroundColor={"gray-50"}
      position="relative"
      overflow="hidden"
    >
      {!isMobile ? (
        <ImmersiveHomepageBackground
          height={immersiveBackgroundHeight}
          width={Math.max(windowWidth ?? 0, 1)}
        />
      ) : null}
      <Grid
        areas={
          isMobile
            ? ["header", "content", "footer"]
            : [
                "header  header  header",
                "sidebar content rightSidebar",
                "footer  footer  footer",
              ]
        }
        columns={isMobile ? ["1fr"] : ["0.75fr", "3fr", "0.75fr"]}
        rows={
          isMobile
            ? ["size-800", "auto", "size-1000"]
            : ["size-1600", "auto", "size-1000"]
        }
        height="100vh"
        gap="size-150"
        UNSAFE_style={{ position: "relative", zIndex: 1 }}
      >
        <View gridArea="header">
          <Flex justifyContent={"center"} alignItems={"center"} height={"100%"}>
            <Header>
              <Text
                UNSAFE_style={{
                  fontSize: isMobile ? 34 : 46,
                  fontWeight: "900",
                  letterSpacing: isMobile ? 1.5 : 3,
                }}
              >
                <TypeAnimation
                  sequence={["Lyrictor", 1000]}
                  wrapper="span"
                  speed={1}
                  style={{
                    fontSize: isMobile ? "1.1em" : "1.25em",
                    display: "inline-block",
                  }}
                  cursor={false}
                />
              </Text>
            </Header>
          </Flex>
        </View>
        {!isMobile && <View gridArea="sidebar" />}
        <div
          ref={contentRef}
          style={{ gridArea: "content", overflow: "hidden" }}
        >
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
              marginBottom={isFullScreen ? undefined : (isMobile ? "12px" : "25px")}
              marginTop={isFullScreen ? undefined : (isMobile ? "8px" : "25px")}
            >
              <FeaturedProject
                maxWidth={featuredProjectWidth}
                maxHeight={featuredProjectHeight}
              />
            </Flex>
          </div>
          <div
            className="project-list-container"
            style={{
              width: "100%",
              height: projectListHeight,
              WebkitMaskImage: !isMobile
                ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 3%, rgba(0,0,0,0.7) 6%, black 12%, black 88%, rgba(0,0,0,0.7) 94%, rgba(0,0,0,0.3) 97%, transparent 100%)"
                : undefined,
              maskImage: !isMobile
                ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 3%, rgba(0,0,0,0.7) 6%, black 12%, black 88%, rgba(0,0,0,0.7) 94%, rgba(0,0,0,0.3) 97%, transparent 100%)"
                : undefined,
            }}
          >
            {isMobile ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
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
                    top: 36,
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
                {projectsContent}
              </RSC>
            )}
          </div>
        </div>
        {!isMobile && <View gridArea="rightSidebar" />}
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
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{ borderRadius: 999 }}
            >
              <Button
                variant={"secondary"}
                onPress={handleOnCreateClick}
                UNSAFE_style={{
                  minWidth: isMobile ? 124 : 136,
                  minHeight: 42,
                  borderRadius: 999,
                  padding: isMobile ? "0 10px" : "0 12px",
                  backgroundColor: "rgb(28, 32, 36)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "rgb(244, 247, 250)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  fontWeight: 700,
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
      </Grid>
    </View>
  );
}

function ImmersiveHomepageBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
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
          top: -290,
          left: "50%",
          width,
          height,
          transform: "translateX(-50%) scale(2.18)",
          transformOrigin: "center top",
          opacity: 0.38,
          filter: "blur(70px) saturate(1.05)",
          willChange: "transform, opacity",
          WebkitMaskImage:
            "radial-gradient(ellipse at center 16%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 34%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.2) 78%, transparent 100%), linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.9) 24%, rgba(0,0,0,0.56) 56%, rgba(0,0,0,0.18) 78%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse at center 16%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 34%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.2) 78%, transparent 100%), linear-gradient(180deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.9) 24%, rgba(0,0,0,0.56) 56%, rgba(0,0,0,0.18) 78%, transparent 100%)",
        }}
      >
        <LyricPreview maxWidth={width} maxHeight={height} isEditMode={false} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4, 5, 7, 0.16) 0%, rgba(6, 7, 9, 0.06) 22%, rgba(4, 5, 7, 0.34) 54%, rgba(0, 0, 0, 0.86) 100%)",
        }}
      />
    </div>
  );
}

function calculate16by9Size(
  windowHeight: number,
  windowWidth: number,
  heightFactor?: number
) {
  const effectiveHeightFactor = heightFactor ?? (isMobile ? 0.62 : 0.4);
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
