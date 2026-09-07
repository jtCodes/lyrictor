import { createDefaultLightField, LightField, LightPaletteKeyframe, LightSettings } from "./store";

export function activeLightChange(settings: LightSettings, offset: number) {
  return [...settings.paletteKeyframes].reverse().find(change => offset >= change.startOffset && offset < change.endOffset);
}

export function lightInsertionRange(position: number, start: number, duration: number): [number, number] {
  const from = Math.max(0, Math.min(Math.max(0, duration - .01), position - start));
  return [from, Math.min(duration, from + 1)];
}

export function updateLightChange(settings: LightSettings, id: string, patch: Partial<LightPaletteKeyframe>, duration: number): LightSettings {
  return { ...settings, paletteKeyframes: settings.paletteKeyframes.map(change => {
    if (change.id !== id) return change;
    const next = { ...change, ...patch };
    next.startOffset = Math.max(0, Math.min(Math.max(0, duration - .01), next.startOffset));
    next.endOffset = Math.min(duration, Math.max(next.startOffset + Math.min(.01, duration), next.endOffset));
    next.transitionDuration = Math.min(Math.max(0, next.transitionDuration ?? 0), (next.endOffset - next.startOffset) / 2);
    return next;
  }).sort((a,b) => a.startOffset - b.startOffset) };
}

// Fields use parallel arrays in each saved palette. Keep them aligned when a
// field is added or removed; otherwise a later field inherits its neighbour's colors.
export function removeLightField(settings: LightSettings, index: number): LightSettings {
  const without = <T,>(items: T[] | undefined) => items?.filter((_, i) => i !== index);
  return { ...settings, fields: settings.fields.filter((_, i) => i !== index),
    paletteKeyframes: settings.paletteKeyframes.map(change => ({ ...change,
      fieldColors: without(change.fieldColors) ?? [], fieldOpacities: without(change.fieldOpacities),
      fieldBeatReactive: without(change.fieldBeatReactive),
    })) };
}

export function addLightField(settings: LightSettings): LightSettings {
  const field = createDefaultLightField();
  return { ...settings, fields: [...settings.fields, field], paletteKeyframes: settings.paletteKeyframes.map(change => ({
    ...change,
    fieldColors: [...settings.fields.map((f,i) => change.fieldColors[i] ?? f.color), field.color],
    fieldOpacities: [...settings.fields.map((f,i) => change.fieldOpacities?.[i] ?? f.opacity), field.opacity],
    fieldBeatReactive: [...settings.fields.map((f,i) => change.fieldBeatReactive?.[i] ?? fieldBeatSettings(f)), fieldBeatSettings(field)],
  })) };
}

export function fieldBeatSettings(field: LightField) {
  return { intensity: field.beatReactiveIntensity, focus: field.beatReactiveFocus,
    affectsSize: field.beatReactiveSize, affectsOpacity: field.beatReactiveOpacity };
}
