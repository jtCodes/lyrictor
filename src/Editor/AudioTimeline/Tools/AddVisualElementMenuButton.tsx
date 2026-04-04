import {
  ActionButton,
  Item,
  Menu,
  MenuTrigger,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useProjectStore } from "../../../Project/store";
import { HEADER_BUTTON_CLASS, headerButtonStyle } from "../../../theme";
import { buildDefaultGrainSetting } from "../../Grain/addGrainToTimeline";
import { buildDefaultLightSetting } from "../../Light/addLightToTimeline";
import {
  buildDefaultAuroraSetting,
  buildDefaultVisualizerSetting,
} from "../../Visualizer/addVisualizerToTimeline";

type VisualMenuAction = "visualizer" | "aurora" | "light" | "grain";

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

function VisualElementsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.25" y="3" width="8.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3.6 8.2 5.5 6.4l1.7 1.5 1.7-2.1 1.25 1.35"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.1" cy="5.2" r="0.8" fill="currentColor" />
      <circle cx="13.2" cy="12.2" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13.2 10.9v2.6M11.9 12.2h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function AddVisualElementMenuButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleAction(action: VisualMenuAction) {
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
    <TooltipTrigger delay={1000}>
      <MenuTrigger>
        <ActionButton
          aria-label="Add visual element"
          isQuiet
          width={"size-10"}
          UNSAFE_className={HEADER_BUTTON_CLASS}
          UNSAFE_style={headerButtonStyle(false)}
        >
          <VisualElementsIcon />
        </ActionButton>
        <Menu onAction={(key) => void handleAction(key as VisualMenuAction)}>
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
      <Tooltip>Add visual element</Tooltip>
    </TooltipTrigger>
  );
}