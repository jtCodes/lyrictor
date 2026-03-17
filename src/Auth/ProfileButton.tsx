import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../api/firebase";
import { useAuthStore } from "./store";
import { DropdownMenu, DropdownMenuItem, DropdownDivider, DropdownLabel, DropdownSection } from "../components/DropdownMenu";
import UserSettingsModal from "./UserSettingsModal";

export default function ProfileButton() {
  const user = useAuthStore((state) => state.user);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("Sign-in error:", error);
      }
    }
  };

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          padding: 0,
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "rgba(255, 255, 255, 0.06)",
          color: "rgba(255, 255, 255, 0.72)",
          cursor: "pointer",
          transition: "background-color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.10)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.20)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
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
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    );
  }

  return (
    <>
    <DropdownMenu
      topOffset={42}
      trigger={
        <button
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.15)",
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : (
            <span
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {user.displayName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </button>
      }
    >
      <DropdownLabel>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.88)",
          }}
        >
          {user.displayName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.45)",
            marginTop: 2,
          }}
        >
          {user.email}
        </div>
      </DropdownLabel>
      <DropdownMenuItem
        onClick={() => setSettingsOpen(true)}
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        }
      >
        Settings
      </DropdownMenuItem>
      <DropdownDivider />
      <DropdownMenuItem onClick={() => auth.signOut()}>
        Sign out
      </DropdownMenuItem>
    </DropdownMenu>
    <UserSettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
    />
    </>
  );
}
