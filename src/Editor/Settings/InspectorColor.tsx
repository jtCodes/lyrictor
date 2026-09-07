import { useEffect, useId, useRef, useState } from "react";
import type { RGBColor } from "react-color";

export function inspectorColorHex(color: RGBColor) {
  return "#" + [color.r, color.g, color.b].map(value =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")
  ).join("");
}

export default function InspectorColor({ label, value, presets, onChange, onCommit }: {
  label: string; value: RGBColor; presets?: string[];
  onChange: (value: RGBColor) => void; onCommit: () => void;
}) {
  const id = useId(), hex = inspectorColorHex(value);
  const [draft, setDraft] = useState(hex);
  const cancelled = useRef(false);
  useEffect(() => setDraft(hex), [hex]);
  function apply(color: string) {
    const expanded = /^#?[\da-f]{3}$/i.test(color)
      ? color.replace("#", "").split("").map(c => c + c).join("") : color.replace("#", "");
    if (!/^[\da-f]{6}$/i.test(expanded)) return false;
    onChange({ ...value, r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4), 16) });
    return true;
  }
  return <>
    <div className="inspector-select-row inspector-color-row">
      <label htmlFor={id}>{label}</label>
      <div className="inspector-color-value">
        <input type="color" value={hex} aria-label={`Choose ${label.toLowerCase()}`} onChange={event => apply(event.target.value)} onBlur={onCommit} />
        <input id={id} className="inspector-input inspector-hex" value={draft} maxLength={7} spellCheck={false}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => { if (cancelled.current || !apply(draft)) setDraft(hex); cancelled.current = false; onCommit(); }}
          onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { cancelled.current = true; event.currentTarget.blur(); } }} />
        <input className="inspector-input inspector-color-alpha" type="number" min={0} max={100} step={1}
          aria-label={`${label} alpha percent`} title="Color alpha (%)" value={Math.round((value.a ?? 1) * 100)}
          onChange={event => { if (event.target.value !== "") onChange({ ...value, a: Math.max(0, Math.min(100, Number(event.target.value))) / 100 }); }}
          onBlur={onCommit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
        <span className="inspector-unit">%</span>
      </div>
    </div>
    {Boolean(presets?.length) && <div className="inspector-color-presets" aria-label={`${label} artwork colors`}>
      {presets?.map((color, index) => <button key={`${color}-${index}`} type="button" style={{ background: color }}
        title={`Use artwork color ${color}`} aria-label={`Use artwork color ${color}`}
        onClick={() => { apply(color); onCommit(); }} />)}
    </div>}
  </>;
}
