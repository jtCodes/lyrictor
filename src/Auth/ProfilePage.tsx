import { useEffect, useState } from "react";
import { View } from "@adobe/react-spectrum";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAuthStore } from "./store";
import ProfileButton from "./ProfileButton";

interface ProfileData {
  username: string;
  uid: string;
}

export default function ProfilePage() {
  const { username: urlUsername } = useParams<{ username: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile =
    currentUser && profile && currentUser.uid === profile.uid;

  useEffect(() => {
    if (!urlUsername) return;

    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);

      // Look up uid from usernames collection
      const usernameSnap = await getDoc(
        doc(db, "usernames", urlUsername.toLowerCase())
      );
      if (!usernameSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const uid = usernameSnap.data().uid;
      const displayUsername = usernameSnap.data().displayName ?? urlUsername;

      setProfile({ username: displayUsername, uid });
      setLoading(false);
    };

    fetchProfile();
  }, [urlUsername]);

  if (notFound) {
    return (
      <View backgroundColor="gray-50" height="100vh" overflow="hidden">
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            zIndex: 10,
          }}
        >
          <BackButton onClick={() => navigate("/")} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "rgba(255, 255, 255, 0.4)",
            fontSize: 15,
          }}
        >
          User not found
        </div>
      </View>
    );
  }

  return (
    <View backgroundColor="gray-50" height="100vh" overflow="hidden">
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          zIndex: 10,
        }}
      >
        <ProfileButton />
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          zIndex: 10,
        }}
      >
        <BackButton onClick={() => navigate("/")} />
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          paddingTop: 56,
        }}
      >
        {/* User Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "32px 24px 24px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {profile?.username?.[0]?.toUpperCase() ?? "?"}
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.92)",
                letterSpacing: 0.3,
              }}
            >
              {loading ? "" : (profile?.username ?? urlUsername)}
            </div>
          </div>
        </div>
      </div>
    </View>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "rgba(255, 255, 255, 0.55)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 4px",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Home
    </button>
  );
}
