let cpuBlur: boolean | undefined;

export function usesCpuCanvasBlur() {
  if (typeof document === "undefined") return false;
  if (cpuBlur !== undefined) return cpuBlur;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  cpuBlur = Boolean(context && !("filter" in context));
  canvas.width = canvas.height = 0;
  return cpuBlur;
}
