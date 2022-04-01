import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@adobe/react-spectrum";

function ProjectListItem() {
  return (
    <Row>
      <Cell>Games</Cell>
      <Cell>File folder</Cell>
      <Cell>6/7/2020</Cell>
    </Row>
  );
}

export default function ProjectList() {
  return (
    <TableView
      aria-label="Example table with static contents"
      selectionMode="single"
      selectionStyle="highlight"
      height="size-3000"
    >
      <TableHeader>
        <Column align="start">Name</Column>
        <Column align="start">Date Modified</Column>
      </TableHeader>
      <TableBody>
        {[...Array(10)].map((item, i) => (
          <Row>
            <Cell>Games</Cell>
            <Cell>6/7/2020</Cell>
          </Row>
        ))}
      </TableBody>
    </TableView>
  );
}
