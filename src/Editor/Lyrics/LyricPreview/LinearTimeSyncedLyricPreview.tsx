import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { LyricText } from "../../types";
import { getCurrentLyricIndex } from "../../utils";

const SCROLL_DURATION = 0.75;

export function TimeSyncedLyrics({
  width,
  height,
  position,
  lyricTexts,
}: {
  width: number;
  height: number;
  position: number;
  lyricTexts: LyricText[];
}) {
  const currentLyricIndex: number | undefined = useMemo(
    () => getCurrentLyricIndex(lyricTexts, position),
    [lyricTexts, position]
  );
  const [lyricHeights, setLyricHeights] = useState<{ [key: number]: number }>(
    {}
  );
  const [currentScrollHeight, setCurrentScrollHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (lyricRefs.current.length > 0) {
      const newHeights: { [key: number]: number } = {};
      lyricRefs.current.forEach((lyricRef, index) => {
        if (lyricRef) {
          newHeights[index] = lyricRef.getBoundingClientRect().height;
        }
      });
      setLyricHeights(newHeights);
    }
    if (currentLyricIndex !== undefined) {
      setCurrentScrollHeight(getCumulativeHeight(currentLyricIndex));
    }
  }, [currentLyricIndex, width, height]);

  const getCumulativeHeight = (index: number) => {
    let totalHeight = 0;
    for (let i = 0; i < index; i++) {
      totalHeight += lyricHeights[i] || 0;
      totalHeight += 20;
    }
    return totalHeight;
  };

  function calculateFontSize(width: number, height: number): number {
    return Math.min(width, height) * 0.067;
  }

  function calculatePadding(width: number, height: number): number {
    return Math.min(width, height) * 0.025;
  }

  return (
    <div
      style={{
        overflow: "hidden",
        height: "100%",
        width,
        position: "relative",
      }}
      ref={containerRef}
    >
      <div
        style={{
          position: "absolute",
          top: "25%",
          width: "100%",
          paddingLeft: "25%",
          paddingRight: "25%"
        }}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -currentScrollHeight }}
          transition={{ ease: "easeInOut", duration: SCROLL_DURATION }}
        >
          {lyricTexts.map((lyric, index) => (
            <motion.div
              key={index}
              ref={(el) => (lyricRefs.current[index] = el)}
              style={{
                fontFamily: "Inter Variable",
                padding: calculatePadding(width, height),
                fontSize: calculateFontSize(width, height) + "px",
                fontWeight: "bolder",
                backgroundColor: "transparent",
                marginBottom: "20px",
              }}
              animate={{
                color:
                  currentLyricIndex === index
                    ? "rgba(255, 255, 255, 1)"
                    : "rgba(255, 255, 255, 0.35)",
              }}
              transition={{ duration: 0.5 }}
            >
              {lyric.text}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
