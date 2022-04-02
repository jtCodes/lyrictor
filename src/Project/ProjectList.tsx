import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@adobe/react-spectrum";
import { useState, useEffect } from "react";
import { loadProjects } from "./store";
import { Project } from "./types";

export default function ProjectList({
  onSelectionChange,
}: {
  onSelectionChange: (project?: Project) => void;
}) {
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);

  useEffect(() => {
    setExistingProjects(loadProjects());
  }, []);

  return (
    <TableView
      aria-label="Example table with static contents"
      selectionMode="single"
      selectionStyle="highlight"
      // height="size-3000"
      disallowEmptySelection={true}
      onSelectionChange={(key: any) => {
        const project = existingProjects.find(
          (project) => project.id === key.currentKey
        );
        onSelectionChange(project)
      }}
    >
      <TableHeader>
        <Column align="start">Name</Column>
        <Column align="start">Date Modified</Column>
      </TableHeader>
      <TableBody>
        {existingProjects.map((item, i) => (
          <Row key={item.id}>
            <Cell>{item.projectDetail.name}</Cell>
            <Cell>{item.projectDetail.createdDate}</Cell>
          </Row>
        ))}
      </TableBody>
    </TableView>
  );
}
