import ProfileButton from "../Auth/ProfileButton";

export default function PageNavbar({
  onBack,
  showProfile = true,
  zIndex = 10,
}: {
  onBack: () => void;
  showProfile?: boolean;
  zIndex?: number;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          zIndex,
        }}
      >
        <button
          onClick={onBack}
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
            transition: "color 0.1s",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
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
          Back
        </button>
      </div>
      {showProfile ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            zIndex,
          }}
        >
          <ProfileButton />
        </div>
      ) : null}
    </>
  );
}