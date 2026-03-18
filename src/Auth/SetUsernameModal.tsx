import UsernameForm from "./UsernameForm";
import { useAuthStore } from "./store";

export default function SetUsernameModal() {
  const user = useAuthStore((state) => state.user);
  const username = useAuthStore((state) => state.username);
  const authReady = useAuthStore((state) => state.authReady);

  if (!authReady || !user || username) return null;

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
    >
      <div
        style={{
          width: 400,
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
        <div
          style={{
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
            Choose a username
          </span>
        </div>
        <div style={{ padding: "16px 20px", textAlign: "left" }}>
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
      </div>
    </div>
  );
}
