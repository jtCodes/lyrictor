import { useState } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import Modal from "../components/Modal";
import { DropdownMenuItem } from "../components/DropdownMenu";
import { checkForDesktopUpdate, openUpdateDownload, type UpdateCheckResult } from "../appUpdate";
import { isDesktopApp } from "../runtime";

type AvailableUpdateResult = Extract<UpdateCheckResult, { status: "update-available" }>;

export function useDesktopUpdate() {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [isOpeningUpdateDownload, setIsOpeningUpdateDownload] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdateResult | null>(null);

  const handleCheckForUpdates = async () => {
    if (isCheckingForUpdates) {
      return;
    }

    setIsCheckingForUpdates(true);

    try {
      const result = await checkForDesktopUpdate();

      if (result.status === "unavailable") {
        ToastQueue.info(result.message, { timeout: 4000 });
        return;
      }

      if (result.status === "up-to-date") {
        ToastQueue.positive(`Lyrictor ${result.currentVersion} is up to date.`, {
          timeout: 3000,
        });
        return;
      }

      setAvailableUpdate(result);
    } catch (error) {
      console.error("Failed to check for updates:", error);
      ToastQueue.negative(
        error instanceof Error
          ? `Failed to check for updates: ${error.message}`
          : "Failed to check for updates",
        { timeout: 5000 }
      );
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const handleOpenUpdateDownload = async () => {
    if (!availableUpdate || isOpeningUpdateDownload) {
      return;
    }

    setIsOpeningUpdateDownload(true);

    try {
      await openUpdateDownload(availableUpdate.downloadUrl);
      setAvailableUpdate(null);
      ToastQueue.info(
        availableUpdate.openedReleasePage
          ? "The latest release page was opened. Download the newest DMG, open it, then replace Lyrictor in Applications."
          : "The latest DMG should open in your browser. After it downloads, open it and replace Lyrictor in Applications.",
        { timeout: 6000 }
      );
    } catch (error) {
      console.error("Failed to open update download:", error);
      ToastQueue.negative(
        error instanceof Error
          ? `Failed to open update download: ${error.message}`
          : "Failed to open update download",
        { timeout: 5000 }
      );
    } finally {
      setIsOpeningUpdateDownload(false);
    }
  };

  const closeUpdateModal = () => {
    if (!isOpeningUpdateDownload) {
      setAvailableUpdate(null);
    }
  };

  return {
    availableUpdate,
    closeUpdateModal,
    handleCheckForUpdates,
    handleOpenUpdateDownload,
    isCheckingForUpdates,
    isOpeningUpdateDownload,
  };
}

export function DesktopUpdateModal({
  availableUpdate,
  isOpeningUpdateDownload,
  onClose,
  onDownload,
}: {
  availableUpdate: AvailableUpdateResult | null;
  isOpeningUpdateDownload: boolean;
  onClose: () => void;
  onDownload: () => void;
}): JSX.Element | null {
  if (!availableUpdate) {
    return null;
  }

  return (
    <Modal
      open={availableUpdate !== null}
      onClose={onClose}
      title="Update Available"
      width={460}
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={isOpeningUpdateDownload}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.78)",
              fontSize: 13,
              fontWeight: 600,
              cursor: isOpeningUpdateDownload ? "default" : "pointer",
              opacity: isOpeningUpdateDownload ? 0.5 : 1,
            }}
          >
            Later
          </button>
          <button
            onClick={onDownload}
            disabled={isOpeningUpdateDownload}
            style={{
              padding: "9px 14px",
              borderRadius: 9,
              border: "1px solid rgba(255, 255, 255, 0.16)",
              background: "rgba(255, 255, 255, 0.10)",
              color: "rgba(255, 255, 255, 0.92)",
              fontSize: 13,
              fontWeight: 600,
              cursor: isOpeningUpdateDownload ? "default" : "pointer",
              opacity: isOpeningUpdateDownload ? 0.7 : 1,
            }}
          >
            {isOpeningUpdateDownload ? "Opening..." : "Download Update"}
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: 6,
            }}
          >
            Lyrictor {availableUpdate.latestVersion} is ready.
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "rgba(255, 255, 255, 0.55)",
            }}
          >
            You are currently on {availableUpdate.currentVersion}. Download the latest DMG, open it, then drag Lyrictor into Applications to replace your current version.
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255, 255, 255, 0.78)" }}>
            Next steps
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255, 255, 255, 0.52)" }}>
            1. Click Download Update.
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255, 255, 255, 0.52)" }}>
            2. Open the downloaded DMG.
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "rgba(255, 255, 255, 0.52)" }}>
            3. Replace the existing app in Applications.
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function DesktopUpdateMenuItem({
  isCheckingForUpdates,
  onClick,
  _closeMenu,
}: {
  isCheckingForUpdates: boolean;
  onClick: () => void;
  _closeMenu?: () => void;
}): JSX.Element | null {
  if (!isDesktopApp) {
    return null;
  }

  return (
    <DropdownMenuItem
      onClick={() => {
        _closeMenu?.();
        onClick();
      }}
      disabled={isCheckingForUpdates}
      icon={
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      }
    >
      {isCheckingForUpdates ? "Checking..." : "Check for updates"}
    </DropdownMenuItem>
  );
}