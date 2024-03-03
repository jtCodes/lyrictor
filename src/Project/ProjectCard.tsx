import { Flex, Heading, View, Text } from "@adobe/react-spectrum";
import "./Project.css";
import { Project, ProjectDetail } from "./types";
import { useProjectStore } from "./store";
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project }: { project: Project }) {
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);

  const navigate = useNavigate();

  function handleOnClick() {
    setEditingProject(project.projectDetail as unknown as ProjectDetail);
    setLyricReference(project.lyricReference);
    setLyricTexts(project.lyricTexts);

    navigate(`/edit`);
  }

  return (
    <div onClick={handleOnClick}>
      <View
        UNSAFE_className="card"
        padding="size-300"
        borderWidth="thin"
        borderColor="gray-200"
        borderRadius="medium"
        width="size-2400"
        backgroundColor={"gray-50"}
        height={"size-2000"}
      >
        <Flex
          direction={"column"}
          height={"100%"}
          justifyContent={"space-between"}
        >
          <View>
            <Heading level={6} UNSAFE_style={{ fontWeight: 600 }}>
              {project.projectDetail.name}
            </Heading>
          </View>
          <View>
            <Text UNSAFE_style={{ opacity: 0.5 }}>by Lyrictor</Text>
          </View>
        </Flex>
      </View>
    </div>
  );
}
