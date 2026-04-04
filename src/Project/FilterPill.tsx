import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
const FILTERS_WIDTH = 204;
const SEARCH_WIDTH = 294;

const PILL_TRANSITION = {
  type: "spring",
  stiffness: 520,
  damping: 36,
  mass: 0.8,
} as const;

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
      <motion.div
        animate={{ width: isSearchOpen ? SEARCH_WIDTH : FILTERS_WIDTH }}
        transition={PILL_TRANSITION}
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
          overflow: "hidden",
          width: FILTERS_WIDTH,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 32,
          }}
        >
          <AnimatePresence initial={false}>
            {!isSearchOpen ? (
              <motion.div
                key="filters"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -16, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 1,
                  paddingRight: 14,
                }}
              >
                {options.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    layout
                    type="button"
                    onClick={() => onFilterChange(value)}
                    whileTap={{ scale: 0.97 }}
                    transition={PILL_TRANSITION}
                    style={{
                      position: "relative",
                      border: "none",
                      outline: "none",
                      cursor: "pointer",
                      borderRadius: 999,
                      padding: "5px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      background: "transparent",
                      color:
                        filter === value
                          ? "rgba(255, 255, 255, 0.95)"
                          : "rgba(255, 255, 255, 0.45)",
                      zIndex: 1,
                    }}
                  >
                    {filter === value ? (
                      <motion.span
                        layoutId="homepage-filter-pill-selection"
                        transition={PILL_TRANSITION}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 999,
                          background: "rgba(255, 255, 255, 0.15)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.2)",
                          zIndex: -1,
                        }}
                      />
                    ) : null}
                    <motion.span layout transition={PILL_TRANSITION}>
                      {label}
                    </motion.span>
                  </motion.button>
                ))}
                <motion.button
                  layout
                  type="button"
                  onClick={() => {
                    if (filter !== "discover") {
                      onFilterChange("discover");
                    }

                    onSearchOpen();
                  }}
                  aria-label="Search published projects"
                  whileHover={{ scale: 1.05, color: "rgba(255, 255, 255, 0.76)" }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  style={{
                    width: 28,
                    height: 32,
                    marginLeft: 8,
                    marginRight: 2,
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    color: "rgba(255, 255, 255, 0.6)",
                    flexShrink: 0,
                  }}
                >
                  <motion.svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </motion.svg>
                </motion.button>
              </motion.div>
            ) : null}
            {isSearchOpen ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 18, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut", delay: 0.06 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
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
                <motion.button
                  type="button"
                  onClick={onSearchClose}
                  aria-label="Close search"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
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
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
