import { ProjectDetail } from "./types";
import { getProjectSourceTagInfo } from "./sourcePlugins";
import ProjectSourceLinkIcon from "./ProjectSourceLinkIcon";

export default function ProjectSourceTag({
  projectDetail,
  size = "default",
  onPress,
  ariaLabel,
  title,
}: {
  projectDetail?: ProjectDetail;
  size?: "default" | "compact";
  onPress?: () => void;
  ariaLabel?: string;
  title?: string;
}) {
  const tagInfo = getProjectSourceTagInfo(projectDetail);

  if (!tagInfo) {
    return null;
  }

  const isCompact = size === "compact";
  const sharedStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tagInfo.provider ? (isCompact ? 4 : 5) : 0,
    borderRadius: 999,
    padding: isCompact ? "1px 5px" : "2px 6px",
    background: tagInfo.appearance.background,
    border: `1px solid ${tagInfo.appearance.borderColor}`,
    boxShadow: tagInfo.appearance.boxShadow,
    color: tagInfo.appearance.color,
    fontSize: isCompact ? 8 : 9,
    fontWeight: 500,
    letterSpacing: 0.1,
    lineHeight: 1,
    whiteSpace: "nowrap" as const,
    opacity: isCompact ? 0.58 : 0.66,
    filter: "saturate(0.82)",
  };

  const content = (
    <>
      {tagInfo.provider ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: isCompact ? 10 : 11,
            height: isCompact ? 10 : 11,
            flexShrink: 0,
          }}
        >
          <ProjectSourceLinkIcon
            provider={tagInfo.provider}
            size={isCompact ? 10 : 11}
          />
        </span>
      ) : null}
      {tagInfo.label}
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPress();
        }}
        aria-label={ariaLabel}
        title={title}
        style={{
          ...sharedStyle,
          appearance: "none",
          cursor: "pointer",
          transition:
            "opacity 0.12s ease-out, transform 0.12s ease-out, border-color 0.12s ease-out, box-shadow 0.12s ease-out",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.opacity = isCompact ? "0.86" : "0.94";
          event.currentTarget.style.transform = "translateY(-1px)";
          event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.24)";
          event.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.12)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.opacity = isCompact ? "0.58" : "0.66";
          event.currentTarget.style.transform = "translateY(0)";
          event.currentTarget.style.borderColor = tagInfo.appearance.borderColor;
          event.currentTarget.style.boxShadow = tagInfo.appearance.boxShadow ?? "none";
        }}
        onFocus={(event) => {
          event.currentTarget.style.opacity = isCompact ? "0.86" : "0.94";
          event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.24)";
          event.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255, 255, 255, 0.12)";
        }}
        onBlur={(event) => {
          event.currentTarget.style.opacity = isCompact ? "0.58" : "0.66";
          event.currentTarget.style.borderColor = tagInfo.appearance.borderColor;
          event.currentTarget.style.boxShadow = tagInfo.appearance.boxShadow ?? "none";
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      style={sharedStyle}
    >
      {content}
    </span>
  );
}