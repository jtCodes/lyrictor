import { Flex, View } from "@adobe/react-spectrum";
import React from "react";
import CreateNewProjectForm from "./CreateNewProject";
import ProjectList from "./ProjectList";

export default function ProjectSelectionScreen() {
  return (
    <View backgroundColor={'gray-100'}>
      <Flex
        height={"100vh"}
        direction="column"
        alignItems={"center"}
        justifyContent={"center"}
      >
        <View width={"size-2900"}>
          <ProjectList />
          <CreateNewProjectForm />
        </View>
      </Flex>
    </View>
  );
}
