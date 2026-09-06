import { ReactNode, useId, useRef, useState } from "react";
import { NumberField } from "@base-ui/react/number-field";
import { Slider } from "@base-ui/react/slider";
import { Collapsible } from "@base-ui/react/collapsible";
import { Switch } from "@base-ui/react/switch";
import "./inspector.css";

export function InspectorSection({ title, children, defaultOpen = true }: {
  title: string; children: ReactNode; defaultOpen?: boolean;
}) {
  return <Collapsible.Root defaultOpen={defaultOpen} className="inspector-section">
    <Collapsible.Trigger className="inspector-section-title"><span className="inspector-chevron" aria-hidden>›</span>{title}</Collapsible.Trigger>
    <Collapsible.Panel>{children}</Collapsible.Panel>
  </Collapsible.Root>;
}

type NumericProps = {
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; help?: string; disabled?: boolean; resetValue?: number;
  onChange: (value: number) => void; onCommit: () => void;
};

/** Continuous changes preview immediately; commits end one undo transaction. */
export function InspectorNumber({ label, value, min, max, step = 1, unit,
  help, disabled, resetValue, onChange, onCommit, slider = true }: NumericProps & { slider?: boolean }) {
  const id = useId();
  const [isEmpty, setIsEmpty] = useState(false);
  return <div className={`inspector-property ${slider ? "" : "inspector-property-number"}`}>
    <NumberField.Root id={id} value={isEmpty ? null : value} min={min} max={max} step={step}
      disabled={disabled} className="inspector-number-root"
      onValueChange={next => {
        setIsEmpty(next === null);
        if (next !== null && Number.isFinite(next)) onChange(next);
      }}
      onValueCommitted={() => { setIsEmpty(false); onCommit(); }}>
      <NumberField.ScrubArea className="inspector-label" title={help}>
        <label htmlFor={id}>{label}</label>
      </NumberField.ScrubArea>
      <div className="inspector-number-box">
        <NumberField.Input className="inspector-input" onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-describedby={unit ? `${id}-unit` : undefined} />
        {unit && <span id={`${id}-unit`} className="inspector-unit">{unit}</span>}
      </div>
    </NumberField.Root>
    {slider && <Slider.Root value={value} min={min} max={max} step={step} disabled={disabled}
      onValueChange={next => onChange(Array.isArray(next) ? next[0] : next)}
      onValueCommitted={onCommit} className="inspector-slider">
      <Slider.Control className="inspector-slider-control">
        <Slider.Track className="inspector-slider-track"><Slider.Indicator className="inspector-slider-fill" />
          <Slider.Thumb className="inspector-slider-thumb" aria-label={label} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>}
    {resetValue !== undefined && <button type="button" className="inspector-reset"
      aria-label={`Reset ${label}`} title={`Reset ${label} to ${resetValue}${unit ?? ""}`}
      disabled={disabled || value === resetValue} onClick={() => { onChange(resetValue); onCommit(); }}>↺</button>}
  </div>;
}

export function InspectorRange({ value, min, max, step, labels, onChange, onCommit }: {
  value: [number, number]; min: number; max: number; step: number;
  labels: [string, string]; onChange: (value: [number, number]) => void; onCommit: () => void;
}) {
  return <Slider.Root value={value} min={min} max={max} step={step}
    minStepsBetweenValues={1} thumbCollisionBehavior="none" disabled={max <= min}
    onValueChange={onChange} onValueCommitted={onCommit} className="inspector-range">
    <Slider.Control className="inspector-slider-control">
      <Slider.Track className="inspector-slider-track">
        <Slider.Indicator className="inspector-slider-fill" />
        <Slider.Thumb index={0} className="inspector-slider-thumb" aria-label={labels[0]} />
        <Slider.Thumb index={1} className="inspector-slider-thumb" aria-label={labels[1]} />
      </Slider.Track>
    </Slider.Control>
  </Slider.Root>;
}

export function InspectorSelect({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const pointerSelection = useRef(false);
  return <div className="inspector-select-row"><label htmlFor={id}>{label}</label>
    <select id={id} className="inspector-select" value={value} disabled={disabled}
      onPointerDown={event => {
        pointerSelection.current = true;
        event.currentTarget.dataset.pointerFocus = "true";
      }}
      onKeyDown={event => {
        pointerSelection.current = false;
        delete event.currentTarget.dataset.pointerFocus;
      }}
      onBlur={event => {
        pointerSelection.current = false;
        delete event.currentTarget.dataset.pointerFocus;
      }}
      onChange={event => {
        onChange(event.target.value);
        if (pointerSelection.current) event.currentTarget.blur();
      }}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>;
}

export function InspectorToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return <div className="inspector-toggle-row"><label htmlFor={id}>{label}</label>
    <Switch.Root id={id} checked={checked} onCheckedChange={onChange} className="inspector-switch">
      <Switch.Thumb className="inspector-switch-thumb" />
    </Switch.Root>
  </div>;
}
