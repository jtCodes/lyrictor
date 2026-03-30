import { Button, Flex, Text, View } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useAudioPosition } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { DEFAULT_PARTICLE_SETTINGS } from "../Particles/store";
import { buildDefaultVisualizerSetting } from "../Visualizer/addVisualizerToTimeline";

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
      </Flex>
    </View>
  );
}