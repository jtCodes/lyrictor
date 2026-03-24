import { useEffect } from "react";
import { useProjectStore } from "../Project/store";
import { openExternalUrl } from "../runtime";
import Modal from "./Modal";

const DEFAULT_RELEASES_URL = "https://github.com/jtCodes/lyrictor/releases";

export default function DesktopAppRequiredPopup({
  isOpen,
  onClose,
  title = "Desktop app required",
  description,
  releaseUrl = DEFAULT_RELEASES_URL,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description: string;
  releaseUrl?: string;
}) {
  const setIsPopupOpen = useProjectStore((state) => state.setIsPopupOpen);

  useEffect(() => {
    setIsPopupOpen(isOpen);
  }, [isOpen, setIsPopupOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={title} width={400}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.72)",
          marginBottom: 4,
        }}
      >
        Desktop feature
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.35)",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Download the dmg to use desktop-only source handling.
      </div>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.88)",
            marginBottom: 6,
          }}
        >
          GitHub releases
        </div>
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            color: "rgba(255, 255, 255, 0.42)",
          }}
        >
          {description}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.78)",
              padding: "10px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => {
              void openExternalUrl(releaseUrl);
              onClose();
            }}
            style={{
              border: "none",
              background:
                "linear-gradient(135deg, rgba(168, 218, 220, 0.95) 0%, rgba(117, 189, 255, 0.95) 100%)",
              color: "rgba(5, 12, 18, 0.96)",
              padding: "10px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Get the dmg
          </button>
        </div>
      </div>
    </Modal>
  );
}