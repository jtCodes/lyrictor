import { ReactNode, useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 400,
  maxHeight = "80vh",
  showCloseButton = true,
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  maxHeight?: number | string;
  showCloseButton?: boolean;
}) {
  useEffect(() => {
    if (!open || !onClose) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-modal-title"
        style={{
          width,
          maxHeight,
          backgroundColor: "rgb(30, 33, 38)",
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(event) => event.stopPropagation()}
      >
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
            id="shared-modal-title"
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.88)",
            }}
          >
            {title}
          </span>
          {showCloseButton ? (
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
              onMouseEnter={(event) => {
                event.currentTarget.style.color = "rgba(255, 255, 255, 0.72)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = "rgba(255, 255, 255, 0.40)";
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
          ) : null}
        </div>
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          {children}
        </div>
        {footer ? (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}