import { Fragment, ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { openExternalUrl } from "../runtime";
import ProjectSourceLinkIcon from "./ProjectSourceLinkIcon";
import {
  getProjectSourceLinkInfo,
  getProjectSourcePluginForProject,
} from "./sourcePlugins";
import { Project, ProjectDetail } from "./types";
import { BrowserInfo } from "./browserInfo";

type DisplayProject = Project & {
  username?: string;
  publishedAt?: string;
};

type ProjectInfoRow = "source" | "updated" | "length" | "browser";

function formatDuration(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function getProjectBrowserInfo(project?: DisplayProject): BrowserInfo | undefined {
  return project?.savedBrowserInfo ?? project?.publishedBrowserInfo;
}

function formatBrowserInfo(browserInfo?: BrowserInfo) {
  if (!browserInfo) {
    return undefined;
  }

  if (browserInfo.runtime === "desktop-app") {
    return `Desktop app on ${browserInfo.os}`;
  }

  return `${browserInfo.name} on ${browserInfo.os}`;
}

function getProjectInfoDisplayDate(
  projectDetail: ProjectDetail,
  project?: DisplayProject
): Date | string {
  if (project?.publishedAt) {
    return project.publishedAt;
  }

  return projectDetail.updatedDate ?? projectDetail.createdDate;
}

interface ProjectInfoSectionProps {
  projectDetail: ProjectDetail;
  project?: Project;
  width: number | string;
  compact?: boolean;
  isLocalPreview?: boolean;
  eyebrowLabel?: ReactNode;
  ownerUsername?: string;
  truncateText?: boolean;
  hiddenRows?: ProjectInfoRow[];
}

export default function ProjectInfoSection({
  projectDetail,
  project,
  width,
  compact = false,
  isLocalPreview = false,
  eyebrowLabel,
  ownerUsername,
  truncateText = false,
  hiddenRows = [],
}: ProjectInfoSectionProps) {
  const navigate = useNavigate();
  const [isBrowserInfoOpen, setIsBrowserInfoOpen] = useState(false);
  const sourcePlugin = getProjectSourcePluginForProject(projectDetail);
  const extendedProject = project as DisplayProject | undefined;
  const browserInfo = getProjectBrowserInfo(extendedProject);
  const displayOwnerUsername = ownerUsername ?? extendedProject?.username;
  const subtitle = [projectDetail.songName, projectDetail.artistName]
    .filter(Boolean)
    .join(" • ");
  const sourceLinkInfo = getProjectSourceLinkInfo(projectDetail);
  const browserLabel = formatBrowserInfo(browserInfo);
  const sourceLabel = sourcePlugin?.id === "youtube"
    ? "YouTube"
    : projectDetail.appleMusicTrackId
      ? "Apple Music"
      : projectDetail.isLocalUrl
        ? "Local file"
        : "Uploaded audio";
  const updatedLabel = new Date(
    getProjectInfoDisplayDate(projectDetail, extendedProject)
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const visibleRows: Array<{ key: ProjectInfoRow; label: string; value: string }> = [];

  if (!hiddenRows.includes("source")) {
    visibleRows.push({ key: "source", label: "Source", value: sourceLabel });
  }

  if (!hiddenRows.includes("updated")) {
    visibleRows.push({ key: "updated", label: "Updated", value: updatedLabel });
  }

  if (projectDetail.youtubeDurationSeconds && !hiddenRows.includes("length")) {
    visibleRows.push({
      key: "length",
      label: "Length",
      value: formatDuration(projectDetail.youtubeDurationSeconds),
    });
  }

  if (browserLabel && !hiddenRows.includes("browser")) {
    visibleRows.push({ key: "browser", label: "Created on", value: browserLabel });
  }

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
            maxWidth: "100%",
            whiteSpace: truncateText ? "nowrap" : undefined,
            overflow: truncateText ? "hidden" : undefined,
            textOverflow: truncateText ? "ellipsis" : undefined,
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
                      color: "rgba(255, 255, 255, 0.7)",
                      transition: "color 0.12s ease-out",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255, 255, 255, 0.34)",
                        marginRight: 4,
                      }}
                    >
                      Published by
                    </span>
                    <span
                      style={{
                        color: "inherit",
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        textTransform: "none",
                      }}
                    >
                      @{displayOwnerUsername}
                    </span>
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
            display: truncateText ? "-webkit-box" : undefined,
            WebkitBoxOrient: truncateText ? "vertical" : undefined,
            WebkitLineClamp: truncateText ? 2 : undefined,
            overflow: truncateText ? "hidden" : undefined,
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
              whiteSpace: truncateText ? "nowrap" : undefined,
              overflow: truncateText ? "hidden" : undefined,
              textOverflow: truncateText ? "ellipsis" : undefined,
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
        {visibleRows.map((row) => (
          <Fragment key={row.key}>
            <div style={{ color: "rgba(255, 255, 255, 0.36)" }}>{row.label}</div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.82)",
                textAlign: "left",
                whiteSpace: truncateText ? "nowrap" : undefined,
                overflow: truncateText ? "hidden" : undefined,
                textOverflow: truncateText ? "ellipsis" : undefined,
                display: row.key === "browser" ? "inline-flex" : undefined,
                alignItems: row.key === "browser" ? "center" : undefined,
                gap: row.key === "browser" ? 8 : undefined,
              }}
            >
              {row.key === "source" && sourceLinkInfo ? (
                <button
                  type="button"
                  onClick={() => {
                    void openExternalUrl(sourceLinkInfo.url);
                  }}
                  aria-label={sourceLinkInfo.label}
                  title={sourceLinkInfo.label}
                  style={{
                    appearance: "none",
                    border: "none",
                    background: "none",
                    padding: 0,
                    margin: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    maxWidth: "100%",
                    cursor: "pointer",
                    opacity: 0.72,
                    transition: "opacity 0.12s ease-out, transform 0.12s ease-out",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.opacity = "1";
                    event.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.opacity = "0.72";
                    event.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    style={{
                      display: "block",
                      flexShrink: 0,
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    <path
                      d="M14 5h5v5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 14 19 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{
                      color: "rgba(255, 255, 255, 0.82)",
                      lineHeight: 1.3,
                    }}
                  >
                    {row.value}
                  </span>
                  <ProjectSourceLinkIcon provider={sourceLinkInfo.provider} size={14} />
                </button>
              ) : row.key === "browser" ? (
                <>
                  <span
                    style={{
                      minWidth: 0,
                      whiteSpace: truncateText ? "nowrap" : undefined,
                      overflow: truncateText ? "hidden" : undefined,
                      textOverflow: truncateText ? "ellipsis" : undefined,
                    }}
                  >
                    {row.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBrowserInfoOpen(true)}
                    aria-label="Explain browser compatibility info"
                    title="Why this browser matters"
                    style={{
                      appearance: "none",
                      border: "none",
                      background: "none",
                      padding: 0,
                      margin: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "rgba(255, 255, 255, 0.42)",
                      transition: "color 0.12s ease-out, transform 0.12s ease-out",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.78)";
                      event.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.color = "rgba(255, 255, 255, 0.42)";
                      event.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M12 10v6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="7.25" r="1" fill="currentColor" />
                    </svg>
                  </button>
                </>
              ) : (
                row.value
              )}
            </div>
          </Fragment>
        ))}
      </div>
      <Modal
        open={isBrowserInfoOpen}
        onClose={() => setIsBrowserInfoOpen(false)}
        title="Browser compatibility"
        width={420}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            color: "rgba(255, 255, 255, 0.78)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div>
            Lyrictor saves the browser or runtime the creator used so viewers can match the
            same environment for the most consistent rendering and playback behavior.
          </div>
          {browserInfo ? (
            <div style={{ color: "rgba(255, 255, 255, 0.56)" }}>
              This project was last saved or published from {formatBrowserInfo(browserInfo)}.
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}