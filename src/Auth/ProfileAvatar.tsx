interface ProfileAvatarProps {
  displayName?: string | null;
  size?: number;
}

export default function ProfileAvatar({
  displayName,
  size = 34,
}: ProfileAvatarProps) {
  const fontSize = Math.round(size * 0.39);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid rgba(255, 255, 255, 0.12)",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "rgba(255, 255, 255, 0.7)",
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
