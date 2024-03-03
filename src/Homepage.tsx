import { Flex, Grid, Header, View, Text } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";
import { useRef, useState } from "react";

export default function Homepage() {
  const contentRef = useRef(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

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
        columns={["1fr", "3fr", "1fr"]} // Adjusted to include the right sidebar
        rows={["size-1000", "auto", "size-1000"]}
        height="100vh"
        gap="size-100"
      >
        <View gridArea="header">
          <Flex justifyContent={"center"} alignItems={"center"} height={"100%"}>
            <Header>
              <Text UNSAFE_style={{ fontSize: 36, fontWeight: "bold" }}>
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
          style={{ height: "100%" }}
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
            gap="size-500"
            UNSAFE_style={{ padding: 5 }}
            justifyContent={"center"}
          >
            {Array.from({ length: 100 }, (_, index) => (
              <ProjectCard key={index} />
            ))}
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
        <View gridArea="rightSidebar" />
        <View gridArea="footer" />
      </Grid>
    </View>
  );
}
