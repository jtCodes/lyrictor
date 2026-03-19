import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../api/firebase";
import { useAuthStore } from "./store";
import { DropdownMenu, DropdownMenuItem, DropdownDivider, DropdownLabel, DropdownSection } from "../components/DropdownMenu";
import UserSettingsModal from "./UserSettingsModal";
import ProfileAvatar from "./ProfileAvatar";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileButton() {
  const user = useAuthStore((state) => state.user);
  const username = useAuthStore((state) => state.username);
  const authReady = useAuthStore((state) => state.authReady);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        console.error("Sign-in error:", error);
      }
    }
  };

  const content = (() => {
    if (!authReady) {
      return (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.06)",
              borderTopColor: "rgba(255, 255, 255, 0.25)",
            }}
          />
        </motion.div>
      );
    }

    if (!user) {
      return (
        <motion.button
          key="sign-in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
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
            transition: "background-color 0.1s, border-color 0.1s",
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
        </motion.button>
      );
    }

    return null;
  })();

  if (content || !user) {
    return (
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    );
  }

  return (
    <>
    <AnimatePresence mode="wait">
      <motion.div
        key="avatar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
      >
        <DropdownMenu
          topOffset={42}
          trigger={
            <button
          style={{
            padding: 0,
            cursor: "pointer",
            background: "none",
            border: "none",
            borderRadius: "50%",
            transition: "opacity 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <ProfileAvatar
            displayName={username}
            size={34}
          />
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
          {username ?? user.displayName}
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
      {username && <DropdownMenuItem
        onClick={() => navigate(`/user/${username}`)}
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
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      >
        My Profile
      </DropdownMenuItem>}
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
      <DropdownMenuItem
        onClick={() => auth.signOut()}
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
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        }
      >
        Sign out
      </DropdownMenuItem>
    </DropdownMenu>
      </motion.div>
    </AnimatePresence>
    <UserSettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
    />
    </>
  );
}
