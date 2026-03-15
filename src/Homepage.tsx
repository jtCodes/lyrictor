import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useEffect, useRef, useState, useMemo } from "react";
import { loadProjects, useProjectStore } from "./Project/store";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import FeaturedProject from "./Project/Featured/FeaturedProject";
import { checkFullScreen, isMobile, useWindowSize } from "./utils";
import RSC from "react-scrollbars-custom";
import { useAudioPlayer } from "react-use-audio-player";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import { motion } from "framer-motion";

export default function Homepage() {
  const { ready, pause } = useAudioPlayer();
  const isFullScreen = checkFullScreen();
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

  const projectsContent = (
    <div
      className="relative rounded-lg"
      style={{
        height: projectListHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {!isMobile ? (
          <div
            className="sticky top-0 left-0 right-0 h-10 z-10"
            style={{
              background: "linear-gradient( rgba(0, 0, 0, 1),transparent)",
            }}
          />
        ) : null}
        <Flex
          direction="row"
          wrap="wrap"
          gap="size-400"
          UNSAFE_style={{
            padding: isMobile ? "10px 6px 18px" : "10px",
            paddingTop: 0,
          }}
          justifyContent="center"
          alignItems="center"
        >
          {existingProjects.map((p) => (
            <ProjectCard project={p} key={p.id} />
          ))}
        </Flex>
        {!isMobile ? (
          <div
            className="sticky bottom-0 left-0 right-0 h-10 z-10"
            style={{
              background: "linear-gradient(transparent, rgba(0, 0, 0, 1))",
            }}
          />
        ) : null}
      </div>
    </div>
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

  if (isFullScreen) {
    return (
      <View backgroundColor={"gray-50"} height={"100vh"}>
        <Flex justifyContent={"center"} marginBottom={"50px"}>
          <FeaturedProject maxHeight={windowHeight!} maxWidth={windowWidth!} />
        </Flex>
      </View>
    );
  }

  return (
    <View backgroundColor={"gray-50"}>
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
          <div>
            <Flex
              justifyContent={"center"}
              marginBottom={isMobile ? "12px" : "25px"}
              marginTop={isMobile ? "8px" : "25px"}
            >
              <FeaturedProject
                maxWidth={maxWidth}
                maxHeight={maxFeaturedHeight}
              />
            </Flex>
          </div>
          {isMobile ? (
            <div
              style={{
                width: "100%",
                height: projectListHeight,
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
                height: projectListHeight,
              }}
            >
              {projectsContent}
            </RSC>
          )}
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
