import { AlertDialog, Button, DialogTrigger } from "@adobe/react-spectrum";
import { useState } from "react";
import { deleteProject } from "./store";
import { Project } from "./types";

export default function DeleteProjectButton({
  project,
  onProjectDelete,
}: {
  project: Project;
  onProjectDelete: () => void;
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  return (
    <DialogTrigger isOpen={showConfirmation}>
      <Button
        variant="negative"
        onPress={() => {
          setShowConfirmation(true);
        }}
        autoFocus
      >
        Delete selected
      </Button>
      <AlertDialog
        variant="warning"
        title="You are about to delete a project"
        cancelLabel="Cancel"
        primaryActionLabel="Confirm"
        onCancel={() => {
          setShowConfirmation(false);
        }}
        onPrimaryAction={() => {
          deleteProject(project);
          setShowConfirmation(false);
          onProjectDelete()
        }}
      >
        Are you sure you want to delete <h4>{project.projectDetail.name}</h4>
      </AlertDialog>
    </DialogTrigger>
  );
}
