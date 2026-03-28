import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getProjectSourcePluginForProject } from "./sourcePlugins";
import { Project, ProjectDetail } from "./types";

type DisplayProject = Project & {
  username?: string;
  publishedAt?: string;
};

function formatDuration(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

interface ProjectInfoSectionProps {
  projectDetail: ProjectDetail;
  project?: Project;
  width: number | string;
  compact?: boolean;
  isLocalPreview?: boolean;
  eyebrowLabel?: ReactNode;
  ownerUsername?: string;
}

export default function ProjectInfoSection({
  projectDetail,
  project,
  width,
  compact = false,
  isLocalPreview = false,
  eyebrowLabel,
  ownerUsername,
}: ProjectInfoSectionProps) {
  const navigate = useNavigate();
  const sourcePlugin = getProjectSourcePluginForProject(projectDetail);
  const extendedProject = project as DisplayProject | undefined;
  const displayOwnerUsername = ownerUsername ?? extendedProject?.username;
  const subtitle = [projectDetail.songName, projectDetail.artistName]
    .filter(Boolean)
    .join(" • ");
  const sourceLabel = sourcePlugin?.id === "youtube"
    ? "YouTube"
    : projectDetail.appleMusicTrackId
      ? "Apple Music"
      : projectDetail.isLocalUrl
        ? "Local file"
        : "Uploaded audio";
  const updatedLabel = new Date(
    projectDetail.updatedDate ?? projectDetail.createdDate
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      style={{
        width,
        maxWidth: "100%",
        minWidth: undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: compact ? 18 : 24,
        textAlign: "left",
        marginTop: compact ? 4 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: compact ? 10 : 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.42)",
          }}
        >
          {isLocalPreview
            ? "Local preview"
            : displayOwnerUsername
              ? (
                  <span
                    onClick={() => navigate(`/user/${displayOwnerUsername}`)}
                    style={{
                      cursor: "pointer",
                      color: "rgba(255, 255, 255, 0.52)",
                      transition: "color 0.12s ease-out",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.82)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.52)";
                    }}
                  >
                    {`Published by @${displayOwnerUsername}`}
                  </span>
                )
                : eyebrowLabel ?? "Published preview"}
        </div>
        <div
          style={{
            fontSize: compact ? 24 : 30,
            lineHeight: compact ? 1.02 : 0.98,
            fontWeight: 800,
            color: "rgba(255, 255, 255, 0.94)",
            textWrap: compact ? "pretty" : "balance",
            maxWidth: "100%",
          }}
        >
          {projectDetail.name}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: compact ? 14 : 15,
              lineHeight: 1.45,
              color: "rgba(255, 255, 255, 0.68)",
              maxWidth: "100%",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "96px minmax(0, 1fr)" : "72px minmax(0, 1fr)",
          columnGap: compact ? 16 : 14,
          rowGap: compact ? 10 : 12,
          alignItems: "baseline",
          fontSize: 13,
          lineHeight: 1.5,
          paddingTop: compact ? 12 : 0,
          borderTop: compact ? "1px solid rgba(255, 255, 255, 0.08)" : undefined,
        }}
      >
        <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Source</div>
        <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>{sourceLabel}</div>
        <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Updated</div>
        <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>{updatedLabel}</div>
        {projectDetail.youtubeDurationSeconds ? (
          <>
            <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>Length</div>
            <div style={{ color: "rgba(255, 255, 255, 0.82)", textAlign: "left" }}>
              {formatDuration(projectDetail.youtubeDurationSeconds)}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}