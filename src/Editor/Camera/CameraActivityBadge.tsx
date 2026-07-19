export default function CameraActivityBadge({
  active,
  label = active ? "Active" : "Inactive",
}: {
  active: boolean;
  label?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 17,
        padding: "0 6px",
        border: `1px solid ${
          active
            ? "rgba(117, 221, 164, 0.3)"
            : "rgba(255, 255, 255, 0.1)"
        }`,
        borderRadius: 999,
        color: active
          ? "rgba(151, 239, 189, 0.94)"
          : "rgba(255, 255, 255, 0.42)",
        background: active
          ? "rgba(74, 186, 124, 0.12)"
          : "rgba(255, 255, 255, 0.035)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        lineHeight: 1,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
