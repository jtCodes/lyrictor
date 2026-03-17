import useImage from "use-image";
import Konva from "konva";
import { Image } from "react-konva";

export const KonvaImage = ({
  url,
  width,
  height,
  crop,
  pixelate,
}: {
  url: string;
  width: number;
  height: number;
  crop?: boolean;
  pixelate?: number;
}) => {
  const [image] = useImage(url);

  const cropProps =
    crop && image
      ? (() => {
          const imgW = image.naturalWidth;
          const imgH = image.naturalHeight;
          const targetRatio = width / height;
          const imgRatio = imgW / imgH;
          if (imgRatio > targetRatio) {
            const cropW = imgH * targetRatio;
            return { crop: { x: (imgW - cropW) / 2, y: 0, width: cropW, height: imgH } };
          } else {
            const cropH = imgW / targetRatio;
            return { crop: { x: 0, y: (imgH - cropH) / 2, width: imgW, height: cropH } };
          }
        })()
      : {};

  return (
    <Image
      image={image}
      width={width}
      height={height}
      {...cropProps}
      filters={pixelate ? [Konva.Filters.Pixelate] : undefined}
      pixelSize={pixelate}
    />
  );
};
