import { Flex, Grid, Header, View, Text, Button } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useEffect, useRef, useState } from "react";
import { loadProjects, useProjectStore } from "./Project/store";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";

export default function Homepage() {
  const contentRef = useRef(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

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

  function handleOnCreateClick() {
    setEditingProject(undefined);
    setLyricReference(undefined);
    setLyricTexts([]);
    setIsCreateNewProjectPopupOpen(true);

    navigate(`/edit`);
  }

  useEffect(() => {
    setExistingProjects(loadProjects(true));
  }, []);

  if (existingProjects.length === 0) {
    return <Text>No existing projects found</Text>;
  }

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      setAtTop(scrollTop === 0);
      setAtBottom(scrollTop + clientHeight === scrollHeight);
      setScrollTop(scrollTop);
    }
  };

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
          className="relative overflow-auto rounded-lg"
          // onScroll={handleScroll}
          ref={contentRef}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {scrollTop > 0 ? (
              <div
                className="sticky top-0 left-0 right-0 h-10 z-10"
                style={{
                  background: "linear-gradient(rgba(0, 0, 0, 1), transparent)",
                }}
              />
            ) : null}
            <Flex
              direction="row"
              wrap="wrap"
              gap="size-400"
              UNSAFE_style={{
                padding: "15px",
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
                background: "linear-gradient(transparent, rgba(0, 0, 0, 1))",
              }}
            />
          </div>
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
