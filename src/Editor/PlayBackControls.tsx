import { Button } from "@adobe/react-spectrum";
import Play from "@spectrum-icons/workflow/Play";
import Pause from "@spectrum-icons/workflow/Pause";

export default function PlayBackControls() {
  return (
    <Button variant="secondary" isQuiet>
      <Play />
    </Button>
  );
}
