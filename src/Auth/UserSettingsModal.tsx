import { usePreviewUpscaling } from "../Editor/Rendering/upscale/store";
import { usePlaybackDiagnosticsStore } from "../Project/playbackDiagnosticsStore";
import { useEffect, useState } from "react";
import { ToastQueue } from "@react-spectrum/toast";
import { useAuthStore } from "./store";
import type { StoragePreference } from "./store";
import { authenticateWithOpenRouter } from "../api/openRouter";
import { useOpenRouterStore } from "../api/openRouterStore";
import UsernameForm from "./UsernameForm";
import Modal from "../components/Modal";
import { isDesktopApp } from "../runtime";
import {
  getDesktopYouTubeCacheDirectory,
  openDesktopYouTubeCacheDirectory,
} from "../desktop/bridge";

export default function UserSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const upscalingEnabled = usePreviewUpscaling(state => state.enabled);
  const setUpscalingEnabled = usePreviewUpscaling(state => state.setEnabled);
  const diagnosticsEnabled = usePlaybackDiagnosticsStore(state => state.enabled);
  const setDiagnosticsEnabled = usePlaybackDiagnosticsStore(state => state.setEnabled);
  const [isOpenRouterLoading, setIsOpenRouterLoading] = useState(false);
  const [isOpeningYouTubeCacheFolder, setIsOpeningYouTubeCacheFolder] = useState(false);
  const [youTubeCacheDirectory, setYouTubeCacheDirectory] = useState<string | null>(null);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const setStoragePreference = useAuthStore(
    (state) => state.setStoragePreference
  );
  const openRouterApiKey = useOpenRouterStore((state) => state.apiKey);
  const setOpenRouterApiKey = useOpenRouterStore((state) => state.setApiKey);
  const clearOpenRouterApiKey = useOpenRouterStore((state) => state.clearApiKey);
  const openRouterKeyInfo = useOpenRouterStore((state) => state.keyInfo);
  const isOpenRouterKeyInfoLoading = useOpenRouterStore(
    (state) => state.isKeyInfoLoading
  );

  useEffect(() => {
    if (!open || !isDesktopApp) {
      return;
    }

    let isCancelled = false;

    getDesktopYouTubeCacheDirectory()
      .then((directory) => {
        if (!isCancelled) {
          setYouTubeCacheDirectory(directory);
        }
      })
      .catch((error) => {
        console.error("Failed to load YouTube cache directory:", error);
        if (!isCancelled) {
          setYouTubeCacheDirectory(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [open]);

  async function handleOpenRouterSignIn() {
    setIsOpenRouterLoading(true);
    setOpenRouterError(null);

    try {
      const apiKey = await authenticateWithOpenRouter();
      if (!apiKey) {
        return;
      }
      setOpenRouterApiKey(apiKey);
    } catch (error) {
      console.error("OpenRouter sign-in failed:", error);
      setOpenRouterError("Could not sign in with OpenRouter.");
    } finally {
      setIsOpenRouterLoading(false);
    }
  }

  function handleOpenRouterSignOut() {
    setOpenRouterError(null);
    clearOpenRouterApiKey();
    ToastQueue.info("OpenRouter disconnected", { timeout: 3000 });
  }

  async function handleOpenYouTubeCacheFolder() {
    if (isOpeningYouTubeCacheFolder) {
      return;
    }

    setIsOpeningYouTubeCacheFolder(true);

    try {
      const directory = await openDesktopYouTubeCacheDirectory();
      setYouTubeCacheDirectory(directory);
    } catch (error) {
      console.error("Failed to open YouTube cache folder:", error);
      ToastQueue.negative(
        error instanceof Error
          ? `Failed to open YouTube cache folder: ${error.message}`
          : "Failed to open YouTube cache folder",
        { timeout: 5000 }
      );
    } finally {
      setIsOpeningYouTubeCacheFolder(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Settings" width={400} maxHeight="80vh">
          {/* Username */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.72)",
                marginBottom: 4,
              }}
            >
              Public username
            </div>
            <UsernameForm />
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              margin: "20px 0",
            }}
          />

          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.72)",
                marginBottom: 4,
              }}
            >
              OpenRouter
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.35)",
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              Connect your OpenRouter account to use AI features across the app.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.88)",
                    marginBottom: 4,
                  }}
                >
                  {openRouterApiKey
                    ? "OpenRouter connected"
                    : "OpenRouter not connected"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.42)",
                    lineHeight: 1.5,
                  }}
                >
                  {openRouterApiKey
                    ? isOpenRouterKeyInfoLoading
                      ? "Checking available credit..."
                      : openRouterKeyInfo?.limit_remaining != null
                        ? `$${openRouterKeyInfo.limit_remaining.toFixed(2)} available to Lyrictor${
                            openRouterKeyInfo.limit != null
                              ? ` of a $${openRouterKeyInfo.limit.toFixed(2)} key limit`
                              : ""
                          }.`
                        : openRouterKeyInfo
                          ? `No spending limit is set for this key · $${openRouterKeyInfo.usage.toFixed(2)} used.`
                          : "Cloud AI features can use your OpenRouter account."
                    : "Sign in to enable shared AI-powered tools."}
                </div>
              </div>

              <button
                onClick={openRouterApiKey ? handleOpenRouterSignOut : handleOpenRouterSignIn}
                disabled={isOpenRouterLoading}
                style={{
                  flexShrink: 0,
                  minWidth: 98,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: openRouterApiKey
                    ? "1px solid rgba(255, 255, 255, 0.10)"
                    : "1px solid rgba(255, 255, 255, 0.16)",
                  backgroundColor: openRouterApiKey
                    ? "transparent"
                    : "rgba(255, 255, 255, 0.10)",
                  color: "rgba(255, 255, 255, 0.88)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isOpenRouterLoading ? "default" : "pointer",
                  opacity: isOpenRouterLoading ? 0.6 : 1,
                  transition: "background-color 0.12s, border-color 0.12s, opacity 0.12s",
                }}
              >
                {isOpenRouterLoading
                  ? "Connecting..."
                  : openRouterApiKey
                    ? "Sign out"
                    : "Sign in"}
              </button>
            </div>

            {openRouterError ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "rgba(255, 120, 120, 0.92)",
                }}
              >
                {openRouterError}
              </div>
            ) : null}
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              margin: "20px 0",
            }}
          />

          {isDesktopApp ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.72)",
                    marginBottom: 4,
                  }}
                >
                  YouTube cache
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.35)",
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Lyrictor stores downloaded YouTube audio here for reuse.
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(255, 255, 255, 0.78)",
                        marginBottom: 6,
                      }}
                    >
                      Cache folder
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: "rgba(255, 255, 255, 0.46)",
                        wordBreak: "break-all",
                      }}
                    >
                      {youTubeCacheDirectory ?? "Loading folder path..."}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "rgba(255, 184, 77, 0.08)",
                      border: "1px solid rgba(255, 184, 77, 0.18)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "rgba(255, 214, 153, 0.92)",
                        marginBottom: 4,
                      }}
                    >
                      Warning
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: "rgba(255, 224, 184, 0.72)",
                      }}
                    >
                      If you manually delete files from this folder, restart the app before playing YouTube-backed projects again.
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <button
                      onClick={handleOpenYouTubeCacheFolder}
                      disabled={isOpeningYouTubeCacheFolder}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        backgroundColor: "rgba(255, 255, 255, 0.10)",
                        color: "rgba(255, 255, 255, 0.88)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isOpeningYouTubeCacheFolder ? "default" : "pointer",
                        opacity: isOpeningYouTubeCacheFolder ? 0.6 : 1,
                        transition: "background-color 0.12s, border-color 0.12s, opacity 0.12s",
                      }}
                    >
                      {isOpeningYouTubeCacheFolder ? "Opening..." : "Open cache folder"}
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  margin: "20px 0",
                }}
              />
            </>
          ) : null}

          {/* Storage Preference */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.72)",
                marginBottom: 4,
              }}
            >
              Save projects to
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.35)",
                marginBottom: 10,
              }}
            >
              Choose where new projects are stored by default
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {(["cloud", "local"] as StoragePreference[]).map((pref) => (
                <button
                  key={pref}
                  onClick={() => setStoragePreference(pref)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: 13,
                    fontWeight: storagePreference === pref ? 600 : 400,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      storagePreference === pref
                        ? "rgba(255, 255, 255, 0.12)"
                        : "transparent",
                    color:
                      storagePreference === pref
                        ? "rgba(255, 255, 255, 0.90)"
                        : "rgba(255, 255, 255, 0.45)",
                    transition: "background-color 0.12s, color 0.12s",
                  }}
                >
                  {pref === "cloud" ? "☁ Cloud" : "💾 Local"}
                </button>
              ))}
            </div>
          </div>
          <section aria-labelledby="preview-upscaling-heading" style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 }}>
            <h3 id="preview-upscaling-heading" style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 500 }}>Preview quality</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", minHeight: 32 }}>
              <input type="checkbox" checked={upscalingEnabled} aria-describedby="preview-upscaling-description"
                onChange={event => setUpscalingEnabled(event.currentTarget.checked)} />
              720p preview upscaling
            </label>
            <p id="preview-upscaling-description" style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,.6)" }}>
              Render background effects at up to 720p, then upscale to the preview size. Text stays sharp at native resolution. Experimental; turn off to compare. Exports use native rendering.
            </p>
          </section>
          <section aria-labelledby="playback-diagnostics-heading" style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 }}>
            <h3 id="playback-diagnostics-heading" style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 500 }}>Playback diagnostics</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", minHeight: 32 }}>
              <input type="checkbox" checked={diagnosticsEnabled} aria-describedby="playback-diagnostics-description"
                onChange={event => setDiagnosticsEnabled(event.currentTarget.checked)} />
              Show performance overlay
            </label>
            <p id="playback-diagnostics-description" style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,.6)" }}>
              Show frame timing and canvas redraw measurements in all players. Remembered on this device. Measurements stop when turned off.
            </p>
          </section>
    </Modal>
  );
}
