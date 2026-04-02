import { Button, Flex, Text, View } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { buildDefaultLightSetting } from "../Light/addLightToTimeline";
import { DEFAULT_PARTICLE_SETTINGS } from "../Particles/store";
import { buildDefaultVisualizerSetting } from "../Visualizer/addVisualizerToTimeline";

function LightCardIcon() {
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

export default function EffectsManagerView({
  containerHeight,
}: {
  containerHeight: number;
}) {
  const { position } = useAudioPosition({
    highRefreshRate: false,
  });
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleAddVisualizer() {
    const setting = await buildDefaultVisualizerSetting(editingProject?.albumArtSrc);
    addNewLyricText("", position, false, "", true, setting);
  }

  function handleAddParticles() {
    addNewLyricText(
      "",
      position,
      false,
      "",
      false,
      undefined,
      true,
      DEFAULT_PARTICLE_SETTINGS
    );
  }

  async function handleAddLight() {
    const settings = await buildDefaultLightSetting(editingProject?.albumArtSrc);
    addNewLyricText(
      "",
      position,
      false,
      "",
      false,
      undefined,
      false,
      undefined,
      true,
      settings
    );
  }

  return (
    <View height={containerHeight} paddingX="size-200" paddingTop="size-200">
      <Flex direction="column" gap="size-200">
        <View
          UNSAFE_style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <Flex direction="column" gap="size-125">
            <Flex alignItems="center" gap="size-100">
              <GraphStreamRankedAdd size="S" />
              <Text>Visualizer</Text>
            </Flex>
            <Text
              UNSAFE_style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255, 255, 255, 0.56)",
              }}
            >
              Add the existing visualizer item to the timeline at the current playhead.
            </Text>
            <Button variant="accent" onPress={() => void handleAddVisualizer()}>
              Add to Timeline
            </Button>
          </Flex>
        </View>
        <View
          UNSAFE_style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <Flex direction="column" gap="size-125">
            <Flex alignItems="center" gap="size-100">
              <View
                width="size-150"
                height="size-150"
                backgroundColor="orange-500"
                UNSAFE_style={{ borderRadius: 999 }}
              />
              <Text>Particles</Text>
            </Flex>
            <Text
              UNSAFE_style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255, 255, 255, 0.56)",
              }}
            >
              Add a particle element to the timeline, with optional beat-reactive motion.
            </Text>
            <Button variant="accent" onPress={handleAddParticles}>
              Add to Timeline
            </Button>
          </Flex>
        </View>
        <View
          UNSAFE_style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <Flex direction="column" gap="size-125">
            <Flex alignItems="center" gap="size-100">
              <LightCardIcon />
              <Text>Light</Text>
            </Flex>
            <Text
              UNSAFE_style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255, 255, 255, 0.56)",
              }}
            >
              Add a soft color-field background element for mixed light, wall tone, and shadow.
            </Text>
            <Button variant="accent" onPress={() => void handleAddLight()}>
              Add to Timeline
            </Button>
          </Flex>
        </View>
      </Flex>
    </View>
  );
}