import {
  ActionButton,
  Text,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import InfoOutline from "@spectrum-icons/workflow/InfoOutline";

export default function CameraHelpTooltip({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <TooltipTrigger delay={150}>
      <ActionButton
        isQuiet
        aria-label={label}
        UNSAFE_style={{
          width: 22,
          minWidth: 22,
          height: 22,
          minHeight: 22,
          padding: 0,
        }}
      >
        <InfoOutline size="S" />
      </ActionButton>
      <Tooltip>
        <Text>{children}</Text>
      </Tooltip>
    </TooltipTrigger>
  );
}
