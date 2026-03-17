import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../api/firebase";
import { useAuthStore } from "./store";
import type { StoragePreference } from "./store";
import { DropdownMenu, DropdownMenuItem, DropdownDivider, DropdownLabel, DropdownSection } from "../components/DropdownMenu";

export default function ProfileButton() {
  const user = useAuthStore((state) => state.user);
  const storagePreference = useAuthStore((state) => state.storagePreference);
  const setStoragePreference = useAuthStore((state) => state.setStoragePreference);

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
      <DropdownSection>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.40)",
            marginBottom: 6,
            letterSpacing: 0.3,
          }}
        >
          Save projects to
        </div>
        <div
          style={{
            display: "flex",
            borderRadius: 6,
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
                padding: "5px 0",
                fontSize: 12,
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
              {pref === "cloud" ? "Cloud" : "Local"}
            </button>
          ))}
        </div>
      </DropdownSection>
      <DropdownMenuItem onClick={() => auth.signOut()}>
        Sign out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
