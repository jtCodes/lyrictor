import { useEffect, useState } from "react";
import { Text } from "@adobe/react-spectrum";
import Modal from "../components/Modal";
import { EditingMode, ProjectDetail } from "./types";

const TEMPLATE_OPTIONS: {
  mode: EditingMode;
  title: string;
  description: string;
}[] = [
  {
    mode: EditingMode.free,
    title: "Custom",
    description: "Free-positioned lyric layout with manual placement and flexible composition.",
  },
  {
    mode: EditingMode.static,
    title: "Vertical Scrolled",
    description: "Apple Music-style vertical lyric presentation with a guided reading layout.",
  },
];

export default function ProjectSettingsModal({
  open,
  projectDetail,
  onClose,
  onSave,
}: {
  open: boolean;
  projectDetail?: ProjectDetail;
  onClose: () => void;
  onSave: (projectDetail: ProjectDetail) => Promise<void> | void;
}) {
  const [selectedMode, setSelectedMode] = useState<EditingMode>(EditingMode.free);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !projectDetail) {
      return;
    }

    setSelectedMode(projectDetail.editingMode ?? EditingMode.free);
  }, [open, projectDetail]);

  if (!open || !projectDetail) {
    return null;
  }

  const currentProjectDetail = projectDetail;

  const isUnchanged = selectedMode === (currentProjectDetail.editingMode ?? EditingMode.free);

  async function handleSave() {
    const nextProjectDetail: ProjectDetail = {
      ...currentProjectDetail,
      editingMode: selectedMode,
    };

    setIsSaving(true);

    try {
      await onSave(nextProjectDetail);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSaving ? undefined : onClose}
      title="Project Settings"
      width={440}
      maxHeight="80vh"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, width: "100%" }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              minWidth: 88,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.74)",
              fontSize: 12,
              fontWeight: 600,
              cursor: isSaving ? "default" : "pointer",
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving || isUnchanged}
            style={{
              minWidth: 104,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.14)",
              background: isSaving || isUnchanged
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 12,
              fontWeight: 600,
              cursor: isSaving || isUnchanged ? "default" : "pointer",
              opacity: isSaving || isUnchanged ? 0.55 : 1,
            }}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <Text
            UNSAFE_style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.74)",
              marginBottom: 6,
            }}
          >
            Template
          </Text>
          <Text
            UNSAFE_style={{
              display: "block",
              fontSize: 11,
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.42)",
              marginBottom: 14,
            }}
          >
            Choose how this project renders its lyric preview and editing layout.
          </Text>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr",
            }}
          >
            {TEMPLATE_OPTIONS.map((option) => {
              const isSelected = option.mode === selectedMode;

              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setSelectedMode(option.mode)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: isSelected
                      ? "1px solid rgba(255, 255, 255, 0.22)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    background: isSelected
                      ? "rgba(255, 255, 255, 0.09)"
                      : "rgba(255, 255, 255, 0.03)",
                    color: "rgba(255, 255, 255, 0.92)",
                    cursor: "pointer",
                    transition: "background-color 0.12s, border-color 0.12s, transform 0.12s",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(event) => {
                    if (!isSelected) {
                      event.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      event.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    }
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = isSelected
                      ? "rgba(255, 255, 255, 0.09)"
                      : "rgba(255, 255, 255, 0.03)";
                    event.currentTarget.style.borderColor = isSelected
                      ? "rgba(255, 255, 255, 0.22)"
                      : "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "rgba(255, 255, 255, 0.92)",
                          marginBottom: 4,
                        }}
                      >
                        {option.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: "rgba(255, 255, 255, 0.48)",
                        }}
                      >
                        {option.description}
                      </div>
                    </div>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        border: isSelected
                          ? "4px solid rgba(255, 255, 255, 0.88)"
                          : "1px solid rgba(255, 255, 255, 0.2)",
                        background: isSelected
                          ? "rgba(255, 255, 255, 0.16)"
                          : "transparent",
                        flexShrink: 0,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}