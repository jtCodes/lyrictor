import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import { useProjectStore } from "../../Project/store";
import { useEditorStore } from "../store";
import { extractProminentColors, rgbToHex } from "../Visualizer/colorExtractor";
import { LightField, LightPaletteKeyframe, LightSettings as LightSettingsType, normalizeLightSettings } from "./store";
import { InspectorNumber, InspectorRange, InspectorSection, InspectorSelect, InspectorToggle } from "../Settings/Inspector";
import InspectorColor, { inspectorColorHex } from "../Settings/InspectorColor";
import LightFieldEditor from "./LightFieldEditor";
import { getCurrentAudioPosition, useAudioPositionSelector } from "../AudioTimeline/useAudioPosition";
import { subscribeToUserSeek } from "../AudioTimeline/audioSeekEvents";
import { activeLightChange, addLightField, fieldBeatSettings, lightInsertionRange, removeLightField, updateLightChange } from "./lightEditing";
import { createLightPaletteKeyframe, resolveLightPalette } from "./paletteKeyframes";
import { isItemRenderEnabled } from "../utils";
import type { LyricText } from "../types";

export default function LightSettings({ width }: { width: number }) {
  const selected = useEditorStore(state => state.selectedLyricTextIds);
  const items = useProjectStore(state => state.lyricTexts);
  const selectedLight = items.find(item => selected.size === 1 && selected.has(item.id) && (item.isLight || item.elementType === "light"));
  return selectedLight ? <LightInspector key={selectedLight.id} light={selectedLight} width={width} /> : <p className="inspector-note">No light element selected</p>;
}

function LightInspector({ light, width }: { light: LyricText; width: number }) {
  const settings = useMemo(() => normalizeLightSettings(light.lightSettings), [light.lightSettings]);
  const albumArt = useProjectStore(state => state.editingProject?.albumArtSrc);
  const [presets, setPresets] = useState<string[]>();
  useEffect(() => {
    let cancelled = false;
    setPresets(undefined);
    if (albumArt) extractProminentColors(albumArt).then(colors => {
      if (!cancelled) setPresets(colors.map(rgbToHex));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [albumArt]);
  const { playing } = useAudioPlayer();
  const duration = Math.max(0, light.end - light.start);
  const savedSelection = useEditorStore(state => state.lightEditors[light.id]);
  const [initialChange] = useState(() => activeLightChange(settings,
    (useEditorStore.getState().pendingWorkspaceRestore?.playheadPosition ?? getCurrentAudioPosition()) - light.start)?.id);
  const changeId = savedSelection ? savedSelection.changeId : initialChange;
  const change = settings.paletteKeyframes.find(item => item.id === changeId);
  const fieldIndex = Math.min(savedSelection?.fieldIndex ?? 0, Math.max(0, settings.fields.length - 1));
  const transaction = useRef<{ before: LyricText[]; last: LyricText[] } | null>(null);
  const commit = useCallback(() => {
    const edit = transaction.current;
    transaction.current = null;
    const store = useProjectStore.getState();
    if (edit && store.lyricTexts === edit.last && JSON.stringify(edit.before) !== JSON.stringify(edit.last)) store.commitLyricTextsPreview(edit.before);
  }, []);
  useEffect(() => () => commit(), [commit]);
  function preview(update: (current: LightSettingsType) => LightSettingsType) {
    const store = useProjectStore.getState();
    const current = store.lyricTexts.find(item => item.id === light.id);
    if (!current) return;
    const next = store.lyricTexts.map(item => item.id === light.id ? { ...item, lightSettings: update(normalizeLightSettings(current.lightSettings)) } : item);
    transaction.current = { before: transaction.current?.before ?? store.lyricTexts, last: next };
    useProjectStore.setState({ lyricTexts: next });
  }
  function action(update: (current: LightSettingsType) => LightSettingsType) { commit(); preview(update); commit(); }
  function select(nextChangeId?: string, nextFieldIndex = fieldIndex) {
    commit();
    useEditorStore.getState().setLightEditor(light.id, { changeId: nextChangeId, fieldIndex: nextFieldIndex });
  }
  useEffect(() => subscribeToUserSeek(position => {
    if (position < light.start || position >= light.end) return;
    commit();
    const editor = useEditorStore.getState();
    editor.setLightEditor(light.id, { changeId: activeLightChange(settings, position - light.start)?.id,
      fieldIndex: editor.lightEditors[light.id]?.fieldIndex ?? 0 });
  }), [light.id, light.start, light.end, settings, commit]);
  const activity = useAudioPositionSelector(useCallback(({ position }: { position: number }) => {
    if (!isItemRenderEnabled(light) || position < light.start || position >= light.end) return "outside";
    return activeLightChange(settings, position - light.start)?.id ?? "base";
  }, [settings, light]), { highRefreshRate: true, active: playing });
  const index = settings.paletteKeyframes.findIndex(item => item.id === change?.id);
  const activeIndex = settings.paletteKeyframes.findIndex(item => item.id === activity);
  const updateChange = (patch: Partial<LightPaletteKeyframe>) => preview(current => change
    ? updateLightChange(current, change.id, patch, duration) : current);
  function updateField(patch: Partial<LightField>) {
    preview(current => {
      if (!change) return { ...current, fields: current.fields.map((field, i) => i === fieldIndex ? { ...field, ...patch } : field) };
      const currentChange = current.paletteKeyframes.find(item => item.id === change.id);
      if (!currentChange) return current;
      const fields = current.fields.map((field, i) => ({ ...field,
        color: currentChange.fieldColors[i] ?? field.color,
        opacity: currentChange.fieldOpacities?.[i] ?? field.opacity,
        ...(() => { const beat = currentChange.fieldBeatReactive?.[i] ?? fieldBeatSettings(field); return {
          beatReactiveIntensity: beat.intensity, beatReactiveFocus: beat.focus, beatReactiveSize: beat.affectsSize, beatReactiveOpacity: beat.affectsOpacity,
        }; })(),
        ...(i === fieldIndex ? patch : {}),
      }));
      return updateLightChange(current, change.id, { fieldColors: fields.map(f => f.color), fieldOpacities: fields.map(f => f.opacity), fieldBeatReactive: fields.map(fieldBeatSettings) }, duration);
    });
  }
  const baseField = settings.fields[fieldIndex];
  const beat = baseField && (change?.fieldBeatReactive?.[fieldIndex] ?? fieldBeatSettings(baseField));
  const field = baseField && { ...baseField, color: change?.fieldColors[fieldIndex] ?? baseField.color,
    opacity: change?.fieldOpacities?.[fieldIndex] ?? baseField.opacity,
    beatReactiveIntensity: beat!.intensity, beatReactiveFocus: beat!.focus,
    beatReactiveSize: beat!.affectsSize, beatReactiveOpacity: beat!.affectsOpacity };
  function addChange() {
    if (duration < .01) return;
    commit();
    const current = normalizeLightSettings(useProjectStore.getState().lyricTexts.find(item => item.id === light.id)?.lightSettings);
    const position = getCurrentAudioPosition();
    const [start, end] = lightInsertionRange(position, light.start, duration);
    const existing = current.paletteKeyframes.find(item => Math.abs(item.startOffset - start) < .01);
    if (existing) { select(existing.id); return; }
    const added = createLightPaletteKeyframe(current, start, end, resolveLightPalette(current, light.start, light.start + start));
    action(value => ({ ...value, paletteKeyframes: [...value.paletteKeyframes, added].sort((a,b) => a.startOffset - b.startOffset) }));
    select(added.id);
  }
  function itemValue(key: "renderEnabled" | "itemOpacity", value: boolean | number, continuous = false) {
    if (!continuous) commit();
    const store = useProjectStore.getState();
    const next = store.lyricTexts.map(item => item.id === light.id ? { ...item, [key]: value } : item);
    transaction.current = { before: transaction.current?.before ?? store.lyricTexts, last: next };
    useProjectStore.setState({ lyricTexts: next });
    if (!continuous) commit();
  }
  return <div className="settings-inspector inspector-with-dock" style={{ width, maxWidth: "100%", minHeight: "100%" }}>
    <div className="inspector-toolbar">
      <strong title={`Light item · ${light.start.toFixed(2)}–${light.end.toFixed(2)} s`}>Light · {change ? `Change ${index + 1}` : "Base lighting"}</strong>
      <div title="Enable or disable the whole light item"><InspectorToggle label="Enabled" checked={isItemRenderEnabled(light)} onChange={enabled => itemValue("renderEnabled", enabled)} /></div>
    </div>
    <p className="inspector-note" title={change ? "Change times are relative to light start" : undefined}>
      {change
        ? `${change.startOffset.toFixed(2)}–${change.endOffset.toFixed(2)} s · Returns to base after End`
        : `${light.start.toFixed(2)}–${light.end.toFixed(2)} s · Base lighting between changes`}
    </p>
    <div className="inspector-camera-properties">
      {!change && <InspectorSection title="Shared setup" persistenceKey="light.setup">
        <p className="inspector-note">Applies to the whole light, including every change.</p>
        <InspectorNumber label="Overall opacity" min={0} max={100} unit="%" value={(light.itemOpacity ?? 1) * 100} resetValue={100}
          onChange={value => itemValue("itemOpacity", value / 100, true)} onCommit={commit} />
        <InspectorSelect label="Blend mode" value={settings.blendMode} options={[{value:"normal",label:"Normal"},{value:"screen",label:"Screen glow"},{value:"soft-light",label:"Soft light"}]}
          onChange={blendMode => action(current => ({ ...current, blendMode: blendMode as LightSettingsType["blendMode"] }))} />
        <InspectorNumber label="Softness" min={0} max={100} unit="%" value={settings.blur * 100} resetValue={82}
          onChange={blur => preview(current => ({ ...current, blur: blur / 100 }))} onCommit={commit} />
      </InspectorSection>}
      {change && <>
        <div className="inspector-timing">
          <InspectorNumber label="Start" value={change.startOffset} min={0} max={Math.max(0, change.endOffset - .01)} step={.01} unit="s" slider={false} onChange={startOffset => updateChange({ startOffset })} onCommit={commit} />
          <InspectorNumber label="End" value={change.endOffset} min={change.startOffset + .01} max={duration} step={.01} unit="s" slider={false} onChange={endOffset => updateChange({ endOffset })} onCommit={commit} />
        </div>
        <InspectorRange value={[change.startOffset, change.endOffset]} min={0} max={duration} step={.01} labels={["Change start", "Change end"]}
          onChange={([startOffset,endOffset]) => updateChange({ startOffset,endOffset })} onCommit={commit} />
        <InspectorNumber label="Edge fade" min={0} max={(change.endOffset - change.startOffset) / 2} step={.01} unit="s" value={change.transitionDuration ?? 0} resetValue={0}
          help="Fade from base at the start and back to base at the end. Zero makes a cut." onChange={transitionDuration => updateChange({ transitionDuration })} onCommit={commit} />
      </>}
      <InspectorSection title="Background" persistenceKey="light.background">
        <InspectorColor label="Color" value={change?.baseColor ?? settings.baseColor} presets={presets}
          onChange={baseColor => change ? updateChange({ baseColor }) : preview(current => ({ ...current, baseColor }))} onCommit={commit} />
        <InspectorNumber label="Opacity" min={0} max={100} unit="%" value={(change?.baseOpacity ?? settings.baseOpacity) * 100} resetValue={100}
          onChange={value => change ? updateChange({ baseOpacity: value / 100 }) : preview(current => ({ ...current, baseOpacity: value / 100 }))} onCommit={commit} />
      </InspectorSection>
      <InspectorSection title="Light fields" persistenceKey="light.fields"
        help="Each field has its own color, opacity and beat response. Position and motion use base lighting. Choose Base lighting in the Editing menu to adjust them.">
        <div className="inspector-field-picker" role="group" aria-label="Select light field">
          {settings.fields.map((item, i) => <button type="button" className="inspector-button inspector-field-tab" key={i} aria-pressed={i === fieldIndex}
            onClick={event => { if (event.detail > 0) event.currentTarget.blur(); select(change?.id, i); }}>
            <span className="inspector-field-swatch" style={{ background: inspectorColorHex(change?.fieldColors[i] ?? item.color) }} />{i + 1}</button>)}
          {!change && <button type="button" className="inspector-button inspector-button-quiet" aria-label="Add light field" title="Add light field"
            onClick={() => { action(addLightField); select(undefined, settings.fields.length); }}>+</button>}
        </div>
        {field ? <div className="inspector-field-group" role="group" aria-label={`Field ${fieldIndex + 1} settings`}>
          <div className="inspector-field-heading">Field {fieldIndex + 1}</div>
          <LightFieldEditor field={field} scoped={Boolean(change)} presets={presets} onChange={updateField} onCommit={commit} />
          {!change && <div className="inspector-end-actions"><button type="button" className="inspector-button inspector-button-danger"
            onClick={() => { action(current => removeLightField(current, fieldIndex)); select(undefined, Math.max(0, fieldIndex - 1)); }}>Remove field {fieldIndex + 1}</button></div>}
        </div>
          : <p className="inspector-note">No light fields. Add one in base lighting.</p>}
      </InspectorSection>
      {change && <div className="inspector-end-actions"><button type="button" className="inspector-button inspector-button-danger"
        onClick={() => { action(current => ({ ...current, paletteKeyframes: current.paletteKeyframes.filter(item => item.id !== change.id) })); select(undefined); }}>Remove change</button></div>}
    </div>
    <div className="inspector-dock" role="group" aria-label="Light change actions">
      <button type="button" className="inspector-button inspector-button-quiet inspector-current-override" disabled={activity === "outside"}
        onClick={event => { if (event.detail > 0) event.currentTarget.blur(); select(activity === "base" ? undefined : activity); }}>
        <span>◎</span><span>At playhead: {activity === "outside" ? "outside light" : activeIndex < 0 ? "base lighting" : `change ${activeIndex + 1}`}</span>
      </button>
      <div className="inspector-editing-context">
        <InspectorSelect label="Editing" value={change?.id ?? "base"} options={[{value:"base",label:"Base lighting"}, ...settings.paletteKeyframes.map((item,i) => ({value:item.id,label:`Change ${i + 1} · ${item.startOffset.toFixed(2)}–${item.endOffset.toFixed(2)} s`}))]}
          onChange={value => select(value === "base" ? undefined : value)} />
        <AddLightChange light={light} onAdd={addChange} />
      </div>
    </div>
  </div>;
}

function AddLightChange({ light, onAdd }: { light: LyricText; onAdd: () => void }) {
  const { playing } = useAudioPlayer();
  const time = useAudioPositionSelector(useCallback(({position}: {position:number}) =>
    lightInsertionRange(position, light.start, light.end - light.start)[0].toFixed(2), [light.start, light.end]), {highRefreshRate:true,active:playing});
  return <button type="button" className="inspector-button inspector-add-change" disabled={light.end - light.start < .01}
    title={`Add a lighting change at ${time} s from light start`} aria-label={`Add lighting change at ${time} seconds from light start`}
    onClick={event => { if (event.detail > 0) event.currentTarget.blur(); onAdd(); }}>
    <span>+ Add</span><span aria-hidden>·</span><span className="inspector-insertion-time">{time} s</span>
  </button>;
}
