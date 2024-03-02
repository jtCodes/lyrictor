import { Flex, View } from "@adobe/react-spectrum";
import ProjectCard from "./Project/ProjectCard";

export default function Homepage() {
  return (
    <Flex direction="column">
      <View backgroundColor={"gray-50"} height={"100vh"} padding={"size-100"}>
        <ProjectCard />
      </View>
    </Flex>
  );
}
