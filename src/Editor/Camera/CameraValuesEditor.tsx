import { ReactNode } from "react";
import { InspectorNumber, InspectorSection } from "../Settings/Inspector";
import { CameraValues, DEFAULT_CAMERA_SETTINGS } from "./store";

const MOVEMENT_FIELDS = [
  { key: "dollyPosition", label: "Back / forward", min: -100, max: 100, help: "Negative moves backward; positive moves forward. Depth changes perspective." },
  { key: "truckPosition", label: "Left / right", min: -100, max: 100, help: "Negative moves the camera left; positive moves it right." },
  { key: "tilt", label: "Tilt", min: -90, max: 90, unit: "°", help: "Negative tilts down; positive tilts up." },
  { key: "rotation", label: "Rotation", min: -180, max: 180, unit: "°" },
] as const;

export default function CameraValuesEditor({ values, onChange, onCommit, focusControl, focusLocked = false }: {
  values: CameraValues; onChange: (patch: Partial<CameraValues>) => void;
  onCommit: () => void; focusControl?: ReactNode; focusLocked?: boolean;
}) {
  return <>
    <InspectorSection title="Lens">
      <InspectorNumber label="Focal length" unit="mm" min={18} max={200} value={values.focalLength}
        resetValue={DEFAULT_CAMERA_SETTINGS.focalLength} help="50 mm preserves the original framing. Shorter lenses widen; longer lenses crop in."
        onChange={focalLength => onChange({ focalLength })} onCommit={onCommit} />
    </InspectorSection>
    <InspectorSection title="Movement">
      {MOVEMENT_FIELDS.map(field => <InspectorNumber key={field.key} label={field.label}
        min={field.min} max={field.max} unit={"unit" in field ? field.unit : undefined}
        help={"help" in field ? field.help : undefined} value={values[field.key]}
        resetValue={DEFAULT_CAMERA_SETTINGS[field.key]}
        onChange={value => onChange({ [field.key]: value })} onCommit={onCommit} />)}
    </InspectorSection>
    <InspectorSection title="Focus">
      {focusControl}
      <InspectorNumber label="Distance" unit="Z" min={0} max={100} value={values.focusDistance * 100}
        disabled={focusLocked} resetValue={50} help="Z 0 is nearest; Z 100 is farthest."
        onChange={focusDistance => onChange({ focusDistance: focusDistance / 100 })} onCommit={onCommit} />
      <InspectorNumber label="Focus speed" min={0} max={100} value={values.focusChangeSpeed}
        resetValue={DEFAULT_CAMERA_SETTINGS.focusChangeSpeed} help="Lower values change focus slowly; higher values change it faster."
        onChange={focusChangeSpeed => onChange({ focusChangeSpeed })} onCommit={onCommit} />
    </InspectorSection>
  </>;
}
