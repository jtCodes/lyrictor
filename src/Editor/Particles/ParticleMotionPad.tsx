import { useEffect, useMemo, useRef, useState } from "react";

const PAD_SIZE = 148;
const PAD_CENTER = PAD_SIZE / 2;
const PAD_RADIUS = PAD_SIZE / 2 - 10;
const CENTER_SNAP_RADIUS = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeToPad(x: number, y: number) {
  const magnitude = Math.sqrt(x * x + y * y);

  if (magnitude <= 0.0001) {
    return { x: 0, y: 0 };
  }

  if (magnitude <= 1) {
    return { x, y };
  }

  return { x: x / magnitude, y: y / magnitude };
}

function getMagnitude(x: number, y: number) {
  return Math.min(1, Math.sqrt(x * x + y * y));
}

function getPadPosition(clientX: number, clientY: number, rect: DOMRect) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const normalizedX = (localX - PAD_CENTER) / PAD_RADIUS;
  const normalizedY = (localY - PAD_CENTER) / PAD_RADIUS;
  const normalized = normalizeToPad(normalizedX, normalizedY);

  if (Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY) * PAD_RADIUS <= CENTER_SNAP_RADIUS) {
    return { x: 0, y: 0 };
  }

  return normalized;
}

function describeVector(x: number, y: number) {
  const magnitude = getMagnitude(x, y);
  if (magnitude < 0.08) {
    return "No directional travel";
  }

  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  const normalizedDegrees = (degrees + 360) % 360;

  return `${Math.round(normalizedDegrees)}deg ${Math.round(magnitude * 100)}%`;
}

export default function ParticleMotionPad({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (next: { x: number; y: number }) => void;
}) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const normalized = useMemo(() => normalizeToPad(x, y), [x, y]);
  const knobLeft = PAD_CENTER + normalized.x * PAD_RADIUS;
  const knobTop = PAD_CENTER + normalized.y * PAD_RADIUS;

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (pointerIdRef.current !== event.pointerId || !padRef.current) {
        return;
      }

      onChange(getPadPosition(event.clientX, event.clientY, padRef.current.getBoundingClientRect()));
    }

    function handlePointerUp(event: PointerEvent) {
      if (pointerIdRef.current !== event.pointerId || !padRef.current) {
        return;
      }

      onChange(getPadPosition(event.clientX, event.clientY, padRef.current.getBoundingClientRect()));
      pointerIdRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, onChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <div
        ref={padRef}
        onPointerDown={(event) => {
          if (!padRef.current) {
            return;
          }

          pointerIdRef.current = event.pointerId;
          setIsDragging(true);
          event.preventDefault();
          onChange(
            getPadPosition(
              event.clientX,
              event.clientY,
              padRef.current.getBoundingClientRect()
            )
          );
        }}
        style={{
          position: "relative",
          width: PAD_SIZE,
          height: PAD_SIZE,
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.16)",
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03))",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
          touchAction: "none",
          userSelect: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: PAD_CENTER - 1,
            top: 12,
            bottom: 12,
            width: 2,
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.34) 0 3px, transparent 3px 6px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: PAD_CENTER - 1,
            left: 12,
            right: 12,
            height: 2,
            background:
              "repeating-linear-gradient(to right, rgba(255,255,255,0.34) 0 3px, transparent 3px 6px)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: clamp(knobLeft - 11, 7, PAD_SIZE - 29),
            top: clamp(knobTop - 11, 7, PAD_SIZE - 29),
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#4f97ff",
            boxShadow: "0 0 0 2px rgba(16, 18, 22, 0.88), 0 8px 20px rgba(30, 114, 255, 0.35)",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.56)",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {describeVector(normalized.x, normalized.y)}
      </div>
    </div>
  );
}