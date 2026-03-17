import React, { useEffect, useState } from "react";
import { useAuthStore, isValidUsername } from "./store";
import type { StoragePreference } from "./store";

export default function UserSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const setStoragePreference = useAuthStore(
    (state) => state.setStoragePreference
  );
  const username = useAuthStore((state) => state.username);
  const setUsername = useAuthStore((state) => state.setUsername);

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (open) {
      setUsernameInput(username ?? "");
      setUsernameStatus("idle");
      setUsernameError("");
    }
  }, [open, username]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 400,
          maxHeight: "80vh",
          backgroundColor: "rgb(30, 33, 38)",
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.88)",
            }}
          >
            Settings
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.40)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.72)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.40)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px", overflowY: "auto", textAlign: "left" }}>
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
            {username ? (
              <>
                <div
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 8,
                    color: "rgba(255, 255, 255, 0.72)",
                  }}
                >
                  {username}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.30)",
                    marginTop: 6,
                  }}
                >
                  Username cannot be changed once set
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.35)",
                    marginBottom: 10,
                  }}
                >
                  Required to publish projects. 3–20 characters, letters,
                  numbers, and underscores. Cannot be changed once set.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setUsernameStatus("idle");
                      setUsernameError("");
                    }}
                    placeholder="your_username"
                    maxLength={20}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: 13,
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      border: `1px solid ${
                        usernameStatus === "error"
                          ? "rgba(255, 100, 100, 0.4)"
                          : "rgba(255, 255, 255, 0.08)"
                      }`,
                      borderRadius: 8,
                      color: "rgba(255, 255, 255, 0.88)",
                      outline: "none",
                      transition: "border-color 0.12s",
                    }}
                    onFocus={(e) => {
                      if (usernameStatus !== "error") {
                        e.currentTarget.style.borderColor =
                          "rgba(255, 255, 255, 0.20)";
                      }
                    }}
                    onBlur={(e) => {
                      if (usernameStatus !== "error") {
                        e.currentTarget.style.borderColor =
                          "rgba(255, 255, 255, 0.08)";
                      }
                    }}
                  />
                  <button
                    disabled={
                      usernameStatus === "saving" || !usernameInput.trim()
                    }
                    onClick={async () => {
                      setUsernameStatus("saving");
                      setUsernameError("");
                      const result = await setUsername(usernameInput.trim());
                      if (result.success) {
                        setUsernameStatus("saved");
                      } else {
                        setUsernameStatus("error");
                        setUsernameError(result.error ?? "Failed to save");
                      }
                    }}
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: "none",
                      cursor:
                        usernameStatus === "saving" || !usernameInput.trim()
                          ? "default"
                          : "pointer",
                      backgroundColor:
                        usernameStatus === "saved"
                          ? "rgba(100, 200, 100, 0.15)"
                          : "rgba(255, 255, 255, 0.10)",
                      color:
                        usernameStatus === "saved"
                          ? "rgba(100, 200, 100, 0.9)"
                          : usernameStatus === "saving" || !usernameInput.trim()
                          ? "rgba(255, 255, 255, 0.25)"
                          : "rgba(255, 255, 255, 0.80)",
                      transition: "background-color 0.12s, color 0.12s",
                    }}
                  >
                    {usernameStatus === "saving"
                      ? "Saving…"
                      : usernameStatus === "saved"
                      ? "Saved"
                      : "Save"}
                  </button>
                </div>
                {usernameError && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255, 100, 100, 0.85)",
                      marginTop: 6,
                    }}
                  >
                    {usernameError}
                  </div>
                )}
              </>
            )}
          </div>

          <div
            style={{
              height: 1,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              margin: "20px 0",
            }}
          />

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
        </div>
      </div>
    </div>
  );
}
