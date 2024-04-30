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
        minHeight={"size-2000"}
      >
        <Flex
          direction={"column"}
          height={"size-2000"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Flex direction={"column"} gap={10} alignItems={"center"}>
            {project.projectDetail.albumArtSrc ? (
              <View>
                <img
                  height={50}
                  width={50}
                  style={{
                    objectFit: "contain",
                    border: "solid",
                    borderWidth: 1,
                    borderRadius: 2,
                    borderColor: "rgba(211,211,211, 0.15)"
                  }}
                  src={project.projectDetail.albumArtSrc}
                />
              </View>
            ) : null}
            <View>
              <Heading level={6} UNSAFE_style={{ fontWeight: 600 }}>
                {project.projectDetail.name}
              </Heading>
            </View>
          </Flex>
          <View>
            <Text UNSAFE_style={{ opacity: 0.5 }}>by Lyrictor</Text>
          </View>
        </Flex>
      </View>
    </div>
  );
}
