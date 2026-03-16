import { TooltipTrigger, ActionButton, Tooltip } from "@adobe/react-spectrum";
import GraphStreamRankedAdd from "@spectrum-icons/workflow/GraphStreamRankedAdd";
import { useProjectStore } from "../../../Project/store";
import { DEFAULT_VISUALIZER_SETTING, ColorStop, VisualizerSetting } from "../../Visualizer/store";
import { extractProminentColors } from "../../Visualizer/colorExtractor";

export default function AddVisualizerButton({
  position,
}: {
  position: number;
}) {
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const editingProject = useProjectStore((state) => state.editingProject);

  async function handleClick() {
    let setting: VisualizerSetting = JSON.parse(
      JSON.stringify(DEFAULT_VISUALIZER_SETTING)
    );

    if (editingProject?.albumArtSrc) {
      try {
        const colors = await extractProminentColors(
          editingProject.albumArtSrc,
          10
        );
        if (colors.length >= 2) {
          // Sort by luminance: lightest first, darkest last
          const sorted = [...colors].sort(
            (a, b) =>
              (b.r * 0.299 + b.g * 0.587 + b.b * 0.114) -
              (a.r * 0.299 + a.g * 0.587 + a.b * 0.114)
          );
          const lightest = sorted[0];
          const middle = sorted[Math.floor(sorted.length / 2)];
          setting.fillRadialGradientColorStops = [
            {
              stop: 0,
              color: { r: lightest.r, g: lightest.g, b: lightest.b, a: 1 },
              beatSyncIntensity: 1,
            },
            {
              stop: 1,
              color: { r: middle.r, g: middle.g, b: middle.b, a: 1 },
              beatSyncIntensity: 0,
            },
          ];
        }
      } catch (e) {
        // Fall back to defaults
      }
    }

    addNewLyricText("", position, false, "", true, setting);
  }

  return (
    <TooltipTrigger delay={1000}>
      <ActionButton
        aria-label="Add new visualizer at cursor"
        isQuiet
        width={"size-10"}
        onPress={handleClick}
      >
        <GraphStreamRankedAdd />
      </ActionButton>
      <Tooltip>Add new visualizer at cursor</Tooltip>
    </TooltipTrigger>
  );
}
