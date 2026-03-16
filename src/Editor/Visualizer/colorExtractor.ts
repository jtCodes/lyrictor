import { RGBColor } from "react-color";

const cache = new Map<string, { r: number; g: number; b: number }[]>();

export function extractProminentColors(
  imgSrc: string,
  count: number = 10
): Promise<{ r: number; g: number; b: number }[]> {
  const cacheKey = `${imgSrc}::${count}`;
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      const colorMap = new Map<
        string,
        { r: number; g: number; b: number; count: number }
      >();
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 16) * 16;
        const g = Math.round(data[i + 1] / 16) * 16;
        const b = Math.round(data[i + 2] / 16) * 16;
        const key = `${r},${g},${b}`;
        const existing = colorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(key, { r, g, b, count: 1 });
        }
      }

      const sorted = Array.from(colorMap.values()).sort(
        (a, b) => b.count - a.count
      );

      const picked: { r: number; g: number; b: number }[] = [];
      for (const c of sorted) {
        if (picked.length >= count) break;
        const tooClose = picked.some((p) => {
          const dr = p.r - c.r;
          const dg = p.g - c.g;
          const db = p.b - c.b;
          return Math.sqrt(dr * dr + dg * dg + db * db) < 40;
        });
        if (!tooClose) picked.push(c);
      }

      cache.set(cacheKey, picked);
      resolve(picked);
    };
    img.onerror = () => reject(new Error("Failed to load album art"));
    img.src = imgSrc;
  });
}

export function rgbToHex(c: { r: number; g: number; b: number }): string {
  return `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;
}
