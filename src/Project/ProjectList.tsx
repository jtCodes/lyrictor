import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
  Text,
} from "@adobe/react-spectrum";
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

  if (existingProjects.length === 0) {
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
        const project = existingProjects.find(
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
        {existingProjects.map((item, i) => {
          return (
            <Row key={item?.id}>
              <Cell>{item?.projectDetail.name}</Cell>
              <Cell>{formatDate(item?.projectDetail.createdDate)}</Cell>
            </Row>
          );
        })}
      </TableBody>
    </TableView>
  );
}
