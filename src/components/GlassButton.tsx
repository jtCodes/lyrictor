import React from "react";
import "./GlassButton.css";

interface GlassButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export default function GlassButton({ onClick, children }: GlassButtonProps) {
  return (
    <button className="glass-button" onClick={onClick}>
      {children}
    </button>
  );
}
