import UsernameForm from "./UsernameForm";
import { useAuthStore } from "./store";
import { auth } from "../api/firebase";
import Modal from "../components/Modal";

export default function SetUsernameModal() {
  const user = useAuthStore((state) => state.user);
  const username = useAuthStore((state) => state.username);
  const usernameLoaded = useAuthStore((state) => state.usernameLoaded);

  if (!usernameLoaded || !user || username) return null;

  return (
    <Modal
      open
      title="Choose a username"
      width={400}
      showCloseButton={false}
      footer={
        <button
          onClick={() => auth.signOut()}
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            color: "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            padding: "4px 8px",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"; }}
        >
          Log out
        </button>
      }
    >
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
    </Modal>
  );
}
