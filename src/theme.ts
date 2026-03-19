import { CSSProperties } from "react";
import "./theme.css";

export const HEADER_BUTTON_CLASS = "header-btn";

export function headerButtonStyle(isActive: boolean): CSSProperties {
  return {
    cursor: "pointer",
    background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
    border: isActive
      ? "1px solid rgba(255, 255, 255, 0.1)"
      : "1px solid transparent",
    borderRadius: 8,
    color: isActive
      ? "rgba(255, 255, 255, 0.85)"
      : "rgba(255, 255, 255, 0.4)",
    transition: "all 0.15s ease",
  };
}
