import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useEffect, useRef, useState, useMemo } from "react";
import { loadProjects, useProjectStore } from "./Project/store";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import FeaturedProject from "./Project/Featured/FeaturedProject";
import { checkFullScreen, useWindowSize } from "./utils";
import RSC from "react-scrollbars-custom";

export default function Homepage() {
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

  useEffect(() => {
    setExistingProjects(loadProjects(true));
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
    setEditingProject(undefined);
    setLyricReference(undefined);
    setLyricTexts([]);
    setIsCreateNewProjectPopupOpen(true);

    navigate(`/edit`);
  }

  if (existingProjects.length === 0) {
    return <Text>No existing projects found</Text>;
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
        areas={[
          "header  header  header",
          "sidebar content rightSidebar",
          "footer  footer  footer",
        ]}
        columns={["0.75fr", "3fr", "0.75fr"]}
        rows={["size-1600", "auto", "size-1000"]}
        height="100vh"
        gap="size-150"
      >
        <View gridArea="header">
          <Flex justifyContent={"center"} alignItems={"center"} height={"100%"}>
            <Header>
              <Text
                UNSAFE_style={{
                  fontSize: 46,
                  fontWeight: "900",
                  letterSpacing: 3,
                }}
              >
                <TypeAnimation
                  sequence={["Lyrictor", 1000]}
                  wrapper="span"
                  speed={1}
                  style={{ fontSize: "1.25em", display: "inline-block" }}
                  cursor={false}
                />
              </Text>
            </Header>
          </Flex>
        </View>
        <View gridArea="sidebar" />
        <div
          ref={contentRef}
          style={{ gridArea: "content", overflow: "hidden" }}
        >
          <div>
            <Flex
              justifyContent={"center"}
              marginBottom={"25px"}
              marginTop={"25px"}
            >
              <FeaturedProject
                maxWidth={maxWidth}
                maxHeight={maxFeaturedHeight}
              />
            </Flex>
          </div>
          <RSC
            id="RSC-Example"
            style={{
              width: "100%",
              height: (maxContentHeight ?? 0) - maxFeaturedHeight - 60,
            }}
          >
            <div
              className="relative rounded-lg"
              style={{
                height: (maxContentHeight ?? 0) - maxFeaturedHeight - 60,
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
                <div
                  className="sticky top-0 left-0 right-0 h-10 z-10"
                  style={{
                    background:
                      "linear-gradient( rgba(0, 0, 0, 1),transparent)",
                  }}
                />
                <Flex
                  direction="row"
                  wrap="wrap"
                  gap="size-400"
                  UNSAFE_style={{
                    padding: "10px",
                    paddingTop: 0,
                  }}
                  justifyContent="center"
                  alignItems="center"
                >
                  {existingProjects.map((p) => (
                    <ProjectCard project={p} key={p.id} />
                  ))}
                  {/* {Array(10)
                .fill([...existingProjects])
                .flat()
                .map((p, index) => (
                  <ProjectCard key={index} project={p} />
                ))} */}
                </Flex>

                <div
                  className="sticky bottom-0 left-0 right-0 h-10 z-10"
                  style={{
                    background:
                      "linear-gradient(transparent, rgba(0, 0, 0, 1))",
                  }}
                />
              </div>
            </div>
          </RSC>
        </div>
        <View gridArea="rightSidebar" />
        <View gridArea="footer">
          <Button variant={"accent"} onPress={handleOnCreateClick}>
            Create
          </Button>
        </View>
      </Grid>
    </View>
  );
}

function calculate16by9Size(
  windowHeight: number,
  windowWidth: number,
  heightFactor: number = 0.4
) {
  const maxHeight = windowHeight * heightFactor;
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
