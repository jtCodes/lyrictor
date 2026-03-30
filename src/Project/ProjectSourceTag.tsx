import { ProjectDetail } from "./types";
import { getProjectSourceTagInfo } from "./sourcePlugins";
import ProjectSourceLinkIcon from "./ProjectSourceLinkIcon";

export default function ProjectSourceTag({
  projectDetail,
  size = "default",
}: {
  projectDetail?: ProjectDetail;
  size?: "default" | "compact";
}) {
  const tagInfo = getProjectSourceTagInfo(projectDetail);

  if (!tagInfo) {
    return null;
  }

  const isCompact = size === "compact";

  return (
    <span
      style={{
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
        whiteSpace: "nowrap",
        opacity: isCompact ? 0.58 : 0.66,
        filter: "saturate(0.82)",
      }}
    >
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
    </span>
  );
}