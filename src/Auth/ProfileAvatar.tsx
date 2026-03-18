interface ProfileAvatarProps {
  displayName?: string | null;
  size?: number;
}

function usernameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

export default function ProfileAvatar({
  displayName,
  size = 34,
}: ProfileAvatarProps) {
  const fontSize = Math.round(size * 0.39);
  const hue = usernameToHue(displayName ?? "");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid hsla(${hue}, 50%, 65%, 0.18)`,
        backgroundColor: `hsla(${hue}, 40%, 55%, 0.12)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: `hsla(${hue}, 35%, 78%, 0.75)`,
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {displayName?.[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}
