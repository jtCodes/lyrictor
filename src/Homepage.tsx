import { Flex, Grid, Header, View, Text } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useEffect, useRef, useState } from "react";
import { loadProjects, useProjectStore } from "./Project/store";

export default function Homepage() {
  const contentRef = useRef(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const existingProjects = useProjectStore((state) => state.existingProjects);
  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );

  useEffect(() => {
    setExistingProjects(loadProjects());
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
      console.log(scrollTop, scrollHeight);
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
        <View gridArea="header" UNSAFE_style={{ padding: 15 }}>
          <Flex justifyContent={"center"} alignItems={"center"} height={"100%"}>
            <Header>
              <Text
                UNSAFE_style={{
                  fontSize: 40,
                  fontWeight: "900",
                  letterSpacing: 2.5,
                }}
              >
                Lyrictor
              </Text>
            </Header>
          </Flex>
        </View>
        <View gridArea="sidebar" />
        <div
          className="relative overflow-auto rounded-lg"
          onScroll={handleScroll}
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
                paddingTop: 15,
              }}
              justifyContent="center"
              alignItems="center"
            >
              {existingProjects.map((p) => (
                <ProjectCard project={p} />
              ))}
              {/* {Array(10)
                .fill([...existingProjects])
                .flat()
                .map((p, index) => (
                  <ProjectCard key={index} project={p} />
                ))} */}
            </Flex>

            {!atBottom ? (
              <div
                className="sticky bottom-0 left-0 right-0 h-10 z-10"
                style={{
                  background: "linear-gradient(transparent, rgba(0, 0, 0, 1))",
                }}
              />
            ) : null}
          </div>
        </div>
        <View gridArea="rightSidebar" />
        <View gridArea="footer" />
      </Grid>
    </View>
  );
}
