import { DropdownMenuItem } from "../../../components/DropdownMenu";
import { usePreviewUpscaling } from "./store";
export default function PreviewUpscalingMenuItem() {
  const enabled = usePreviewUpscaling(state => state.enabled);
  const setEnabled = usePreviewUpscaling(state => state.setEnabled);
  return <DropdownMenuItem onClick={() => setEnabled(!enabled)} icon={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />{enabled && <path d="m8 12 3 3 5-6" />}</svg>
  }>720p preview upscaling: {enabled ? "On" : "Off"}</DropdownMenuItem>;
}
