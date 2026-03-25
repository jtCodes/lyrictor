import Modal from "../components/Modal";
import { useAuthStore } from "./store";

export default function DesktopSignInSuccessModal() {
  const isOpen = useAuthStore((state) => state.isDesktopSignInSuccessModalOpen);
  const setIsOpen = useAuthStore(
    (state) => state.setIsDesktopSignInSuccessModalOpen
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title="Signed in on desktop"
      width={400}
      zIndex={2000}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.72)",
          marginBottom: 4,
        }}
      >
        Google sign-in complete
      </div>
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.5,
          color: "rgba(255, 255, 255, 0.42)",
          marginBottom: 16,
        }}
      >
        You can close the Google sign-in page in your browser and return to
        Lyrictor.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.16)",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            color: "rgba(255, 255, 255, 0.88)",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "background-color 0.12s, border-color 0.12s, opacity 0.12s",
          }}
        >
          Back to app
        </button>
      </div>
    </Modal>
  );
}