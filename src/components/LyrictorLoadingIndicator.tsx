import "./LyrictorLoadingIndicator.css";

/** Font-independent musical mark; omit label when adjacent text names the state. */
export default function LyrictorLoadingIndicator({
  label,
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`lyrictor-loading${compact ? " lyrictor-loading-compact" : ""}`}
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox={compact ? "18 0 38 64" : "0 0 96 64"} fill="none" aria-hidden="true" focusable="false">
        {!compact ? <g stroke="currentColor" strokeWidth="0.8" opacity="0.22">
          {[20, 26, 32, 38, 44].map(y => <path key={y} d={`M8 ${y}H88`} />)}
        </g> : null}
        <g className="lyrictor-loading-clef" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M37 40C28 35 27 29 32 22C36 17 43 12 42 7C41 2 36 8 36 14C36 23 39 38 42 51C44 60 32 60 32 53C32 49 37 49 37 52" />
          <path d="M37 40C32 40 31 35 35 32C40 28 47 33 46 40C45 48 32 50 27 43C22 36 28 29 35 29" />
        </g>
        {!compact ? <>
        <g className="lyrictor-loading-note lyrictor-loading-note-one" fill="currentColor">
          <ellipse cx="55" cy="38" rx="3.4" ry="2.4" transform="rotate(-20 55 38)" />
          <path d="M57.5 38V24" stroke="currentColor" strokeWidth="1.4" />
        </g>
        <g className="lyrictor-loading-note lyrictor-loading-note-two" fill="currentColor">
          <ellipse cx="68" cy="32" rx="3.4" ry="2.4" transform="rotate(-20 68 32)" />
          <path d="M70.5 32V18" stroke="currentColor" strokeWidth="1.4" />
        </g>
        <g className="lyrictor-loading-note lyrictor-loading-note-three" fill="currentColor">
          <ellipse cx="81" cy="26" rx="3.4" ry="2.4" transform="rotate(-20 81 26)" />
          <path d="M83.5 26V12" stroke="currentColor" strokeWidth="1.4" />
        </g>
        </> : null}
      </svg>
    </span>
  );
}
