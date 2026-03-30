import appleMusicIcon from "./assets/apple-music-icon.svg";
import youtubeIcon from "./assets/youtube-icon.svg";

type ProjectSourceLinkProvider = "youtube" | "appleMusic";

export default function ProjectSourceLinkIcon({
  provider,
  size = 16,
}: {
  provider: ProjectSourceLinkProvider;
  size?: number;
}) {
  return (
    <img
      src={provider === "youtube" ? youtubeIcon : appleMusicIcon}
      width={size}
      height={size}
      aria-hidden="true"
      alt=""
      style={{
        display: "block",
        width: size,
        height: size,
      }}
    />
  );
}