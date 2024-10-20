import React, { useEffect } from "react";
import {
  Dialog,
  Button,
  Content,
  Heading,
  ActionButton,
  ButtonGroup,
  DialogTrigger,
  Divider,
} from "@adobe/react-spectrum";
import { useProjectStore } from "../store";
import { VideoAspectRatio } from "../types";
import { useProjectService } from "../useProjectService";

interface FixedResolutionUpgradeNoticeProps {
  isOpen: boolean;
  onClose: () => void;
}

function FixedResolutionUpgradeNotice({
  isOpen,
  onClose,
}: FixedResolutionUpgradeNoticeProps) {
  const [saveProject] = useProjectService();
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const editingProject = useProjectStore((state) => state.editingProject);

  function handleConfirm() {
    if (editingProject) {
      setEditingProject({
        ...editingProject,
        resolution: VideoAspectRatio["16/9"],
      });
      saveProject(undefined, {
        ...editingProject,
        resolution: VideoAspectRatio["16/9"],
      });
    }

    onClose();
  }

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      {/* <ActionButton>Publish</ActionButton> */}
      <></>
      {(close) => (
        <Dialog>
          <Heading>Project Upgrade Available!</Heading>
          <Divider />
          <Content>
            <p>
              This project can be upgrade to take advantage of the new enforced
              fixed aspect ratio ensuring your video maintains perfect
              consistency across different browsers and screen sizes.
            </p>
            <p style={{ marginTop: 10 }}>
              For now, we're rolling out the classic <strong>16:9</strong>{" "}
              aspect ratio. Stay tuned for more flexible options coming your
              way!
            </p>
            <p style={{ color: "red", marginTop: 15 }}>
              <strong>Disclaimer:</strong> Please note, opting for this upgrade
              might affect the current positioning of lyrics in your project. We
              recommend a quick review and tweak post-upgrade to ensure
              everything looks just right.
            </p>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button variant="cta" onPress={handleConfirm} autoFocus>
              Confirm
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
}

export default FixedResolutionUpgradeNotice;
