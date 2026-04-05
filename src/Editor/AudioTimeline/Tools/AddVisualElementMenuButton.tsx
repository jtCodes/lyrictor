import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Heading,
  Item,
  Menu,
  MenuTrigger,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import AddCircle from "@spectrum-icons/workflow/AddCircle";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import ImageAutoMode from "@spectrum-icons/workflow/ImageAutoMode";
import TextAdd from "@spectrum-icons/workflow/TextAdd";
import { useState } from "react";
import { useProjectStore } from "../../../Project/store";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../../../theme";
import { buildDefaultGrainSetting } from "../../Grain/addGrainToTimeline";
import AIImageGenerator from "../../Image/AI/AIImageGenerator";
import { useAIImageGeneratorStore } from "../../Image/AI/store";
import { buildDefaultLightSetting } from "../../Light/addLightToTimeline";
import {
  buildDefaultAuroraSetting,
  buildDefaultVisualizerSetting,
} from "../../Visualizer/addVisualizerToTimeline";

type AddMenuAction =
  | "text"
  | "ai-image"
  | "visualizer"
  | "aurora"
  | "light"
  | "grain";

function MenuIconSlot({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 18,
        minWidth: 18,
        height: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "currentColor",
      }}
    >
      {children}
    </span>
  );
}

function AuroraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2 13.2C4.4 8.2 6.4 6.8 8.6 8c1.6.8 2.8-.1 4-1.7 1-1.4 2.1-2.5 3.4-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 15c2.2-4.1 4.2-4.8 5.9-3.9 1.8.9 3-.2 4.4-1.6 1.1-1.2 2.1-1.9 3.7-2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.64"
      />
    </svg>
  );
}

function LightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.2" fill="currentColor" opacity="0.95" />
      <path
        d="M9 1.5v2.1M9 14.4v2.1M1.5 9h2.1M14.4 9h2.1M3.7 3.7l1.5 1.5M12.8 12.8l1.5 1.5M14.3 3.7l-1.5 1.5M5.2 12.8l-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="4" cy="4" r="1" fill="currentColor" opacity="0.9" />
      <circle cx="8.5" cy="3" r="0.9" fill="currentColor" opacity="0.72" />
      <circle cx="13.2" cy="4.8" r="1.1" fill="currentColor" opacity="0.88" />
      <circle cx="5.4" cy="8.8" r="0.85" fill="currentColor" opacity="0.64" />
      <circle cx="10.6" cy="9.5" r="1.15" fill="currentColor" opacity="0.82" />
      <circle cx="14.1" cy="8.4" r="0.75" fill="currentColor" opacity="0.58" />
      <circle cx="4.1" cy="13" r="1.05" fill="currentColor" opacity="0.84" />
      <circle cx="8.9" cy="14.2" r="0.9" fill="currentColor" opacity="0.7" />
      <circle cx="13.5" cy="13.1" r="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export default function AddVisualElementMenuButton({
  position,
}: {
  position: number;
}) {
  const [isAiImageDialogOpen, setIsAiImageDialogOpen] = useState(false);
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );

  function handleConfirmAiImage() {
    if (selectedImageLogItem) {
      addNewLyricText(
        "",
        position,
        true,
        selectedImageLogItem.url,
        false,
        undefined
      );
    }

    setIsAiImageDialogOpen(false);
    setIsPopupOpen(false);
  }

  function handleCloseAiImage() {
    setIsAiImageDialogOpen(false);
    setIsPopupOpen(false);
  }

  async function handleAction(action: AddMenuAction) {
    if (action === "text") {
      addNewLyricText("text", position, false, "", false, undefined);
      return;
    }

    if (action === "ai-image") {
      setIsAiImageDialogOpen(true);
      setIsPopupOpen(true);
      return;
    }

    if (action === "visualizer") {
      const setting = await buildDefaultVisualizerSetting(editingProject?.albumArtSrc);
      addNewLyricText("", position, false, "", true, setting);
      return;
    }

    if (action === "aurora") {
      const setting = await buildDefaultAuroraSetting(editingProject?.albumArtSrc);
      addNewLyricText("", position, false, "", true, setting);
      return;
    }

    if (action === "light") {
      const settings = await buildDefaultLightSetting(editingProject?.albumArtSrc);
      addNewLyricText("", position, false, "", false, undefined, false, undefined, true, settings);
      return;
    }

    addNewLyricText(
      "",
      position,
      false,
      "",
      false,
      undefined,
      false,
      undefined,
      false,
      undefined,
      true,
      buildDefaultGrainSetting()
    );
  }

  return (
    <>
      <TooltipTrigger delay={1000}>
        <MenuTrigger>
          <ActionButton
            aria-label="Add element"
            isQuiet
            width={"size-10"}
            UNSAFE_className={HEADER_BUTTON_CLASS}
            UNSAFE_style={headerButtonStyle(false)}
          >
            <AddCircle size="S" />
          </ActionButton>
          <Menu onAction={(key) => void handleAction(key as AddMenuAction)}>
            <Item key="text" textValue="text">
              <MenuIconSlot>
                <TextAdd size="S" />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>Text</Text>
            </Item>
            <Item key="ai-image" textValue="ai-image">
              <MenuIconSlot>
                <ImageAutoMode size="S" />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>AI Image</Text>
            </Item>
            <Item key="visualizer" textValue="visualizer">
              <MenuIconSlot>
                <GraphStreamRankedAdd size="S" />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>Visualizer</Text>
            </Item>
            <Item key="aurora" textValue="aurora">
              <MenuIconSlot>
                <AuroraIcon />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>Aurora</Text>
            </Item>
            <Item key="light" textValue="light">
              <MenuIconSlot>
                <LightIcon />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>Light</Text>
            </Item>
            <Item key="grain" textValue="grain">
              <MenuIconSlot>
                <GrainIcon />
              </MenuIconSlot>
              <Text UNSAFE_style={{ paddingLeft: 10 }}>Grain</Text>
            </Item>
          </Menu>
        </MenuTrigger>
        <Tooltip>Add element</Tooltip>
      </TooltipTrigger>
      <DialogContainer type="fullscreen" onDismiss={handleCloseAiImage}>
        {isAiImageDialogOpen ? (
          <Dialog>
            <Heading>Add AI Image</Heading>
            <Divider />
            <Content>
              <AIImageGenerator />
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={handleCloseAiImage}>
                Cancel
              </Button>
              <Button
                variant="accent"
                isDisabled={selectedImageLogItem === undefined}
                onPress={handleConfirmAiImage}
              >
                Add Selected Image
              </Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </>
  );
}