import { InspectorNumber, InspectorSection, InspectorSelect, InspectorToggle } from "../Settings/Inspector";
import InspectorColor from "../Settings/InspectorColor";
import { createDefaultLightField, LightField } from "./store";

export default function LightFieldEditor({ field, scoped, presets, onChange, onCommit }: {
  field: LightField; scoped: boolean; presets?: string[]; onChange: (patch: Partial<LightField>) => void;
  onCommit: () => void;
}) {
  const defaults = createDefaultLightField();
  const discrete = (patch: Partial<LightField>) => { onCommit(); onChange(patch); onCommit(); };
  const frequency = field.beatReactiveFocus <= .2 ? "Bass" : field.beatReactiveFocus < .4 ? "Low-mid" : field.beatReactiveFocus <= .6 ? "Mid" : field.beatReactiveFocus < .8 ? "High-mid" : "Treble";
  const strength = field.beatReactiveIntensity <= 0 ? "Off" : field.beatReactiveIntensity <= 1 ? "Subtle" : field.beatReactiveIntensity <= 1.5 ? "Pulse" : field.beatReactiveIntensity <= 1.8 ? "Punchy" : "Flash";
  return <>
    <InspectorColor label="Color" value={field.color} presets={presets} onChange={color => onChange({ color })} onCommit={onCommit} />
    <InspectorNumber label="Opacity" value={field.opacity * 100} min={0} max={100} unit="%" resetValue={35}
      onChange={opacity => onChange({ opacity: opacity / 100 })} onCommit={onCommit} />
    {!scoped && <InspectorSection title="Position & shape" persistenceKey="light.geometry">
      {([
        ["x", "Horizontal", -100, 200, "%"], ["y", "Vertical", -100, 200, "%"],
        ["radiusX", "Width", 5, 320, "%"], ["radiusY", "Height", 5, 320, "%"],
        ["rotation", "Rotation", -180, 180, "°"],
      ] as const).map(([key, label, min, max, unit]) => <InspectorNumber key={key} label={label} min={min} max={max} unit={unit}
        value={field[key] * (key === "rotation" ? 1 : 100)} resetValue={defaults[key] * (key === "rotation" ? 1 : 100)}
        onChange={value => onChange({ [key]: value / (key === "rotation" ? 1 : 100) })} onCommit={onCommit} />)}
      <InspectorNumber label="Motion" value={field.motionAmount * 100} min={0} max={100} unit="%" resetValue={0}
        onChange={motionAmount => onChange({ motionAmount: motionAmount / 100 })} onCommit={onCommit} />
    </InspectorSection>}
    <InspectorSection title="Beat response" persistenceKey="light.beat">
      <InspectorToggle label="React to audio" checked={field.beatReactiveIntensity > 0} onChange={enabled => discrete({ beatReactiveIntensity: enabled ? 1 : 0 })} />
      <InspectorNumber label="Strength" value={field.beatReactiveIntensity * 100} min={0} max={200} unit="%" resetValue={0}
        onChange={value => onChange({ beatReactiveIntensity: value / 100 })} onCommit={onCommit} />
      <InspectorNumber label="Frequency" value={field.beatReactiveFocus * 100} min={0} max={100} disabled={field.beatReactiveIntensity <= 0}
        help="Left follows bass; right follows treble." resetValue={15}
        onChange={value => onChange({ beatReactiveFocus: value / 100 })} onCommit={onCommit} />
      <InspectorSelect label="Affects" disabled={field.beatReactiveIntensity <= 0}
        value={field.beatReactiveSize ? field.beatReactiveOpacity ? "both" : "size" : field.beatReactiveOpacity ? "brightness" : "none"}
        options={[{value:"brightness",label:"Brightness"},{value:"size",label:"Size"},{value:"both",label:"Size + brightness"},{value:"none",label:"Neither"}]}
        onChange={value => discrete({ beatReactiveSize: value === "size" || value === "both", beatReactiveOpacity: value === "brightness" || value === "both" })} />
      <p className="inspector-note">{frequency} · {strength}</p>
    </InspectorSection>
  </>;
}
