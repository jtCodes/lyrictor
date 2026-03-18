import { useState } from "react";
import { useAuthStore } from "./store";

export default function UsernameForm({ onSaved }: { onSaved?: () => void }) {
  const username = useAuthStore((state) => state.username);
  const setUsername = useAuthStore((state) => state.setUsername);

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  if (username) {
    return (
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
    );
  }

  return (
    <>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.35)",
          marginBottom: 10,
        }}
      >
        3–20 characters, letters, numbers, and underscores. Cannot be changed
        once set.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setStatus("idle");
            setError("");
          }}
          placeholder="your_username"
          maxLength={20}
          style={{
            flex: 1,
            padding: "8px 10px",
            fontSize: 13,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: `1px solid ${
              status === "error"
                ? "rgba(255, 100, 100, 0.4)"
                : "rgba(255, 255, 255, 0.08)"
            }`,
            borderRadius: 8,
            color: "rgba(255, 255, 255, 0.88)",
            outline: "none",
            transition: "border-color 0.12s",
          }}
          onFocus={(e) => {
            if (status !== "error") {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
            }
          }}
          onBlur={(e) => {
            if (status !== "error") {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            }
          }}
        />
        <button
          disabled={status === "saving" || !input.trim()}
          onClick={async () => {
            setStatus("saving");
            setError("");
            const result = await setUsername(input.trim());
            if (result.success) {
              setStatus("saved");
              onSaved?.();
            } else {
              setStatus("error");
              setError(result.error ?? "Failed to save");
            }
          }}
          style={{
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor:
              status === "saving" || !input.trim() ? "default" : "pointer",
            backgroundColor:
              status === "saved"
                ? "rgba(100, 200, 100, 0.15)"
                : "rgba(255, 255, 255, 0.10)",
            color:
              status === "saved"
                ? "rgba(100, 200, 100, 0.9)"
                : status === "saving" || !input.trim()
                ? "rgba(255, 255, 255, 0.25)"
                : "rgba(255, 255, 255, 0.80)",
            transition: "background-color 0.12s, color 0.12s",
          }}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
            ? "Saved"
            : "Save"}
        </button>
      </div>
      {error && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 100, 100, 0.85)",
            marginTop: 6,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}
