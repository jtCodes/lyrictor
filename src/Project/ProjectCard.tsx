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
  const setAutoPlayRequested = useProjectStore((state) => state.setAutoPlayRequested);

  const navigate = useNavigate();
  const isSelected = editingProject?.name === project.projectDetail.name;

  function handleOnClick() {
    setAutoPlayRequested(true);
    setEditingProject(project.projectDetail as unknown as ProjectDetail);
    setLyricReference(project.lyricReference);
    setLyricTexts(project.lyricTexts);
    setImageItems(project.images ?? []);

    // navigate(`/edit`);
  }

  const isDemo = project.projectDetail.name.includes("(Demo)");
  const displayName = isDemo
    ? project.projectDetail.name.replace("(Demo)", "").trim()
    : project.projectDetail.name;

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
            ? "1px solid rgba(255, 255, 255, 0.22)"
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
                {displayName}
              </Text>
              {isDemo && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.45)",
                  }}
                >
                  Demo
                </span>
              )}
            </View>
          </Flex>
          <View>
            <span style={{ fontSize: 11, letterSpacing: 0.2 }}>
              <span style={{ opacity: 0.35 }}>by </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const name = (project as any).username || "lyrictor";
                  navigate(`/user/${name}`);
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.85";
                  (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.55";
                  (e.currentTarget as HTMLElement).style.textDecoration = "none";
                }}
                style={{ opacity: 0.55, fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s" }}
              >
                {(project as any).username || "Lyrictor"}
              </span>
            </span>
          </View>
        </Flex>
      </View>
    </div>
  );
}
