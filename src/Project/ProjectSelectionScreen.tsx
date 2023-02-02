import { Flex, View } from "@adobe/react-spectrum";
import React, { useEffect, useState } from "react";
import CreateNewProjectForm from "./CreateNewProjectForm";
import ProjectList from "./ProjectList";
import { loadProjects, useProjectStore } from "./store";
import { Project } from "./types";

export default function ProjectSelectionScreen() {
  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );

  useEffect(() => {
    setExistingProjects(loadProjects());
  }, []);

  return (
    <View backgroundColor={"gray-100"}>
      <Flex
        height={"100vh"}
        direction="column"
        alignItems={"center"}
        justifyContent={"center"}
      >
        <View width={"600px"}>
          <ProjectList onSelectionChange={() => {}} />
          {/* <CreateNewProjectForm /> */}
        </View>
      </Flex>
    </View>
  );
}
