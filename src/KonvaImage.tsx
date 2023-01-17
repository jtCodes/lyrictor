import useImage from "use-image";
import { Image } from "react-konva";

export const KonvaImage = ({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) => {
  const [image] = useImage(url);
  return (
    <Image
      image={image}
      width={width}
      height={height}
    />
  );
};
