import VolumeMute from "@spectrum-icons/workflow/VolumeMute";
import VolumeOne from "@spectrum-icons/workflow/VolumeOne";
import VolumeThree from "@spectrum-icons/workflow/VolumeThree";
import VolumeTwo from "@spectrum-icons/workflow/VolumeTwo";
import {
  ActionButton,
  Content,
  Dialog,
  DialogTrigger,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { CSSProperties, useId, useState } from "react";
import { setGlobalAudioVolume, useGlobalAudioVolume } from "../audioVolume";
import "./ExpandableVolumeControl.css";

function VolumeIcon({ volume }: { volume: number }) {
  if (volume <= 0) {
    return <VolumeMute size="S" />;
  }

  if (volume <= 0.33) {
    return <VolumeOne size="S" />;
  }

  if (volume <= 0.66) {
    return <VolumeTwo size="S" />;
  }

  return <VolumeThree size="S" />;
}

export default function ExpandableVolumeControl() {
  const [isExpanded, setIsExpanded] = useState(false);
  const volume = useGlobalAudioVolume();
  const sliderId = useId();
  const volumePercent = Math.round(volume * 100);

  return (
    <DialogTrigger
      type="popover"
      placement="top"
      offset={8}
      shouldFlip
      isOpen={isExpanded}
      onOpenChange={setIsExpanded}
    >
      <TooltipTrigger delay={300}>
        <ActionButton
          isQuiet
          UNSAFE_className="expandable-volume-control__button"
          UNSAFE_style={{ width: 30, minWidth: 30, height: 30, padding: 0 }}
          aria-label={isExpanded ? "Hide volume control" : "Adjust volume"}
          aria-controls={sliderId}
        >
          <VolumeIcon volume={volume} />
        </ActionButton>
        <Tooltip>{volumePercent}% volume</Tooltip>
      </TooltipTrigger>
      <Dialog
        aria-label="Playback volume"
        UNSAFE_className="expandable-volume-control__dialog"
        UNSAFE_style={
          {
            width: 140,
            minWidth: 140,
            "--spectrum-dialog-padding": "6px",
          } as CSSProperties
        }
      >
        <Content>
          <div
            className="expandable-volume-control__slider-wrap"
            id={sliderId}
          >
            <input
              className="expandable-volume-control__slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePercent}
              aria-label="Playback volume"
              aria-valuetext={`${volumePercent}%`}
              title={`${volumePercent}%`}
              onChange={(event) => {
                setGlobalAudioVolume(Number(event.currentTarget.value) / 100);
              }}
              style={
                {
                  "--volume-progress": `${volumePercent}%`,
                } as CSSProperties
              }
            />
          </div>
        </Content>
      </Dialog>
    </DialogTrigger>
  );
}
