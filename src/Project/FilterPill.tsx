import { useEffect, useRef } from "react";

export type ProjectFilter = "mine" | "discover";

interface FilterPillProps {
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  isSearchOpen: boolean;
  searchValue: string;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
}

const options: { value: ProjectFilter; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "discover", label: "Discover" },
];

export default function FilterPill({
  filter,
  onFilterChange,
  isSearchOpen,
  searchValue,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
}: FilterPillProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isSearchOpen]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: 999,
          padding: 3,
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          minHeight: 38,
        }}
      >
        {isSearchOpen ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: 260,
              padding: "0 10px 0 12px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.62)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onSearchClose();
                }
              }}
              placeholder="Search published projects"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.94)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            />
            <button
              type="button"
              onClick={onSearchClose}
              aria-label="Close search"
              style={{
                width: 24,
                height: 24,
                border: "none",
                outline: "none",
                cursor: "pointer",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.62)",
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            {options.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilterChange(value)}
                style={{
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "5px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  transition: "all 0.12s ease",
                  background:
                    filter === value
                      ? "rgba(255, 255, 255, 0.15)"
                      : "transparent",
                  color:
                    filter === value
                      ? "rgba(255, 255, 255, 0.95)"
                      : "rgba(255, 255, 255, 0.45)",
                  boxShadow:
                    filter === value
                      ? "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.2)"
                      : "none",
                }}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (filter !== "discover") {
                  onFilterChange("discover");
                }

                onSearchOpen();
              }}
              aria-label="Search published projects"
              style={{
                width: 32,
                height: 32,
                marginRight: 2,
                border: "none",
                outline: "none",
                cursor: "pointer",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.52)",
                transition: "all 0.12s ease",
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
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
