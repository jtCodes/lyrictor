import { Flex, Heading, View, Text } from "@adobe/react-spectrum";
import "./Project.css";
import { Project, ProjectDetail } from "./types";
import { useProjectStore } from "./store";
import { useNavigate } from "react-router-dom";

export default function ProjectCard({ project }: { project: Project }) {
  const editingProject = useProjectStore((state) => state.editingProject);
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);
  const setImageItems = useProjectStore((state) => state.setImages);

  const navigate = useNavigate();
  const isSelected = editingProject?.name === project.projectDetail.name;

  function handleOnClick() {
    setEditingProject(project.projectDetail as unknown as ProjectDetail);
    setLyricReference(project.lyricReference);
    setLyricTexts(project.lyricTexts);
    setImageItems(project.images ?? []);

    // navigate(`/edit`);
  }

  return (
    <div onClick={handleOnClick}>
      <View
        UNSAFE_className={`card ${isSelected ? "card-selected" : ""}`}
        padding="size-300"
        borderRadius="medium"
        width="size-2400"
        backgroundColor={"gray-50"}
        minHeight={"size-2000"}
        UNSAFE_style={{
          border: isSelected
            ? "1px solid rgba(255, 255, 255, 0.18)"
            : "1px solid rgba(255, 255, 255, 0.13)",
        }}
      >
        <Flex
          direction={"column"}
          height={"size-2000"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Flex direction={"column"} gap={8} alignItems={"center"}>
            {project.projectDetail.albumArtSrc ? (
              <View>
                <img
                  height={56}
                  width={56}
                  style={{
                    objectFit: "contain",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255, 0.08)",
                  }}
                  src={project.projectDetail.albumArtSrc}
                />
              </View>
            ) : null}
            <View>
              <Text
                UNSAFE_style={{
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "center",
                  lineHeight: 1.35,
                  display: "block",
                }}
              >
                {project.projectDetail.name}
              </Text>
            </View>
          </Flex>
          <View>
            <Text
              UNSAFE_style={{
                opacity: 0.35,
                fontSize: 11,
                letterSpacing: 0.2,
              }}
            >
              by Lyrictor
            </Text>
          </View>
        </Flex>
      </View>
    </div>
  );
}
