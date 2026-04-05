import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

function flattenDropdownChildren(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const fragmentChild = child as React.ReactElement<{ children?: React.ReactNode }>;
      return flattenDropdownChildren(fragmentChild.props.children);
    }

    return [child];
  });
}

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
  const triggerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + (topOffset - 38),
        right: window.innerWidth - rect.right,
      });
    }
  }, [topOffset]);

  useEffect(() => {
    if (menuOpen) {
      updatePosition();
    }
  }, [menuOpen, updatePosition]);

  const normalizedChildren = flattenDropdownChildren(children).reduce<React.ReactNode[]>(
    (acc, child) => {
      const isDivider = React.isValidElement(child) && child.type === DropdownDivider;
      if (isDivider) {
        const last = acc[acc.length - 1];
        const lastIsDivider =
          React.isValidElement(last) && last.type === DropdownDivider;
        if (acc.length === 0 || lastIsDivider) {
          return acc;
        }
      }
      acc.push(child);
      return acc;
    },
    []
  );

  while (normalizedChildren.length > 0) {
    const last = normalizedChildren[normalizedChildren.length - 1];
    const lastIsDivider =
      React.isValidElement(last) && last.type === DropdownDivider;
    if (!lastIsDivider) break;
    normalizedChildren.pop();
  }

  return (
    <div ref={triggerRef}>
      <div onClickCapture={() => setMenuOpen(!menuOpen)}>{trigger}</div>

      {menuOpen &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 10000 }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                top: menuPos.top,
                right: menuPos.right,
                zIndex: 10001,
                minWidth: 180,
                backgroundColor: "rgb(30, 33, 38)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: 10,
                padding: 0,
                overflow: "hidden",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5)",
              }}
            >
              {normalizedChildren.map((child, index) => {
                if (!React.isValidElement(child)) return child;
                const key = `dropdown-item-${index}`;
                if (child.type === DropdownMenuItem) {
                  return React.cloneElement(child as React.ReactElement<any>, {
                    key,
                    _closeMenu: () => setMenuOpen(false),
                  });
                }

                return React.cloneElement(child as React.ReactElement<any>, {
                  key,
                  _closeMenu: () => setMenuOpen(false),
                });
              })}
            </div>
          </>,
          document.body
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
