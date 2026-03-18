import React, { useState, useRef } from "react";

export function DropdownMenu({
  trigger,
  children,
  topOffset = 38,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  topOffset?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <div onClickCapture={() => setMenuOpen(!menuOpen)}>{trigger}</div>

      {menuOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: topOffset,
              right: 0,
              zIndex: 100,
              minWidth: 180,
              backgroundColor: "rgb(30, 33, 38)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              borderRadius: 10,
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            {React.Children.map(children, (child) => {
              if (!React.isValidElement(child)) return child;
              if (child.type === DropdownMenuItem) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  _closeMenu: () => setMenuOpen(false),
                });
              }
              return child;
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  onClick,
  children,
  icon,
  destructive,
  disabled,
  _closeMenu,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  _closeMenu?: () => void;
}) {
  const color = disabled
    ? "rgba(255, 255, 255, 0.3)"
    : destructive
      ? "rgba(255, 100, 100, 0.85)"
      : "rgba(255, 255, 255, 0.72)";
  return (
    <button
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        _closeMenu?.();
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 14px",
        background: "none",
        border: "none",
        color,
        fontSize: 13,
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        transition: "background-color 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = destructive
          ? "rgba(255, 100, 100, 0.08)"
          : "rgba(255, 255, 255, 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {icon && <span style={{ display: "flex", opacity: 0.7 }}>{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        margin: "4px 0",
      }}
    />
  );
}

export function DropdownSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {children}
    </div>
  );
}

export function DropdownLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {children}
    </div>
  );
}
