import { useState, useRef } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import type { Project } from "./types";
import { openProjectForEditing } from "./openProjectForEditing";
import { ActionButton, Text } from "@adobe/react-spectrum";
import Edit from "@spectrum-icons/workflow/Edit";
import { useNavigate } from "react-router-dom";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../theme";

export default function EditProjectButton({ project }: { project?: Project }) {
  const [busy, setBusy] = useState(false);
  const opening = useRef(false);
  const navigate = useNavigate();

  return (
    <ActionButton
      isDisabled={busy}
      onPress={async () => {
        if (opening.current) return;
        opening.current = true; setBusy(true);
        try { if (!project || await openProjectForEditing(project)) navigate("/edit"); }
        catch (error) { ToastQueue.negative(error instanceof Error ? error.message : "Could not open project", { timeout: 5000 }); }
        finally { opening.current = false; setBusy(false); }
      }}
      isQuiet
      UNSAFE_className={HEADER_BUTTON_CLASS}
      UNSAFE_style={headerButtonStyle(false)}
    >
      <Edit />
      <Text>Edit</Text>
    </ActionButton>
  );
}
