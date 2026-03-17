import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
  Text,
} from "@adobe/react-spectrum";
import Cloud from "@spectrum-icons/workflow/Cloud";
import DeviceLaptop from "@spectrum-icons/workflow/DeviceLaptop";
import { useProjectStore } from "./store";
import { Project } from "./types";

function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProjectList({
  onSelectionChange,
}: {
  onSelectionChange: (project?: Project) => void;
}) {
  const existingProjects = useProjectStore((state) => state.existingProjects);

  const sortedProjects = [...existingProjects].sort((a, b) => {
    const dateA = new Date(a.projectDetail.createdDate).getTime();
    const dateB = new Date(b.projectDetail.createdDate).getTime();
    return dateB - dateA;
  });

  if (sortedProjects.length === 0) {
    return <Text>No existing projects found</Text>;
  }

  return (
    <TableView
      aria-label="Example table with static contents"
      selectionMode="single"
      selectionStyle="highlight"
      maxHeight="size-3000"
      disallowEmptySelection={true}
      onSelectionChange={(key: any) => {
        const project = sortedProjects.find(
          (project) => project.id === key.currentKey
        );
        onSelectionChange(project);
      }}
    >
      <TableHeader>
        <Column align="start">Name</Column>
        <Column align="start">Date Modified</Column>
      </TableHeader>
      <TableBody>
        {sortedProjects.map((item, i) => {
          return (
            <Row key={item?.id}>
              <Cell>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {item?.projectDetail.name}
                  {item?.source === "cloud" && (
                    <Cloud size="XXS" UNSAFE_style={{ opacity: 0.5 }} />
                  )}
                  {item?.source === "local" && (
                    <DeviceLaptop size="XXS" UNSAFE_style={{ opacity: 0.5 }} />
                  )}
                </span>
              </Cell>
              <Cell>{formatDate(item?.projectDetail.createdDate)}</Cell>
            </Row>
          );
        })}
      </TableBody>
    </TableView>
  );
}
