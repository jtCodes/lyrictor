export type ProjectFilter = "mine" | "discover";

interface FilterPillProps {
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
}

const options: { value: ProjectFilter; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "discover", label: "Discover" },
];

export default function FilterPill({ filter, onFilterChange }: FilterPillProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 999,
          padding: 3,
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {options.map(({ value, label }) => (
          <button
            key={value}
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
      </div>
    </div>
  );
}
