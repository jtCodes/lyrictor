import { Text } from "@adobe/react-spectrum";
import Cloud from "@spectrum-icons/workflow/Cloud";
import DeviceLaptop from "@spectrum-icons/workflow/DeviceLaptop";
import { useMemo, useState } from "react";
import ProjectSourceTag from "./ProjectSourceTag";
import { useProjectStore } from "./store";
import { Project } from "./types";

const albumArtSize = 42;
const dateColumnWidth = "minmax(120px, 28%)";

function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderAlbumArt(project: Project) {
  const albumArtSrc = project.projectDetail.albumArtSrc;

  if (albumArtSrc) {
    return (
      <img
        src={albumArtSrc}
        alt=""
        style={{
          width: albumArtSize,
          height: albumArtSize,
          borderRadius: 8,
          objectFit: "cover",
          display: "block",
          boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: albumArtSize,
        height: albumArtSize,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.05)",
        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
        color: "rgba(255, 255, 255, 0.26)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

export default function ProjectList({
  selectedProjectId,
  onSelectionChange,
}: {
  selectedProjectId?: string;
  onSelectionChange: (project?: Project) => void;
}) {
  const existingProjects = useProjectStore((state) => state.existingProjects);
  const [internalSelectedProjectId, setInternalSelectedProjectId] = useState<string>();
  const activeSelectedProjectId = selectedProjectId ?? internalSelectedProjectId;

  const sortedProjects = useMemo(
    () =>
      [...existingProjects].sort((a, b) => {
        const dateA = new Date(
          a.projectDetail.updatedDate ?? a.projectDetail.createdDate
        ).getTime();
        const dateB = new Date(
          b.projectDetail.updatedDate ?? b.projectDetail.createdDate
        ).getTime();
        return dateB - dateA;
      }),
    [existingProjects]
  );

  if (sortedProjects.length === 0) {
    return <Text>No existing projects found</Text>;
  }

  return (
    <div
      role="listbox"
      aria-label="Saved projects"
      style={{
        width: "100%",
        maxHeight: 520,
        overflowY: "auto",
        borderRadius: 12,
        border: "1px solid rgba(255, 255, 255, 0.14)",
        background: "rgba(0, 0, 0, 0.22)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(0, 1fr) ${dateColumnWidth}`,
          gap: 16,
          padding: "14px 22px 10px",
          position: "sticky",
          top: 0,
          zIndex: 1,
          background: "rgb(30, 33, 38)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255, 255, 255, 0.72)" }}>
          Name
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.72)",
            textAlign: "right",
          }}
        >
          Date Modified
        </div>
      </div>
      {sortedProjects.map((item, index) => {
        const isSelected = activeSelectedProjectId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              setInternalSelectedProjectId(item.id);
              onSelectionChange(item);
            }}
            style={{
              width: "100%",
              border: "none",
              background: isSelected ? "rgba(255, 255, 255, 0.06)" : "transparent",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              textAlign: "left",
              borderTop: index === 0 ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `minmax(0, 1fr) ${dateColumnWidth}`,
                gap: 16,
                alignItems: "center",
                minHeight: 74,
                padding: "10px 22px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${albumArtSize}px minmax(0, 1fr)`,
                  gap: 12,
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <div style={{ padding: 2 }}>{renderAlbumArt(item)}</div>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(255, 255, 255, 0.92)",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.projectDetail.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ProjectSourceTag projectDetail={item.projectDetail} size="compact" />
                    {item.source === "cloud" && (
                      <Cloud size="XXS" UNSAFE_style={{ opacity: 0.44 }} />
                    )}
                    {item.source === "local" && (
                      <DeviceLaptop size="XXS" UNSAFE_style={{ opacity: 0.44 }} />
                    )}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.82)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textAlign: "right",
                }}
              >
                {formatDate(item.projectDetail.updatedDate ?? item.projectDetail.createdDate)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
