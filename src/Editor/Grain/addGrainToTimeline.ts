import { DEFAULT_GRAIN_SETTINGS, GrainSettings } from "./store";

export function buildDefaultGrainSetting(): GrainSettings {
  return JSON.parse(JSON.stringify(DEFAULT_GRAIN_SETTINGS)) as GrainSettings;
}