import { Flex, View } from "@adobe/react-spectrum";
import React, { useEffect, useState } from "react";
import CreateNewProjectForm from "./CreateNewProjectForm";
import ProjectList from "./ProjectList";
import { loadProjects } from "./store";
import { Project } from "./types";

export default function ProjectSelectionScreen() {
  return (
    <View backgroundColor={"gray-100"}>
      <Flex
        height={"100vh"}
        direction="column"
        alignItems={"center"}
        justifyContent={"center"}
      >
        <View width={"size-2900"}>
          <ProjectList
            onSelectionChange={() => {}}
          />
          {/* <CreateNewProjectForm /> */}
        </View>
      </Flex>
    </View>
  );
}
