import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { LyricText } from "../../types";
import { getCurrentLyricIndex, isItemRenderEnabled, isTextItem } from "../../utils";

const SCROLL_DURATION = 0.75;
const LYRIC_LINE_GAP = 20;
const EDGE_FADE_MASK =
  "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.22) 5%, rgba(0,0,0,0.62) 10%, black 17%, black 60%, rgba(0,0,0,0.78) 68%, rgba(0,0,0,0.4) 76%, transparent 100%)";

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
  const renderedLyricTexts = useMemo(
    () => lyricTexts.filter((lyric) => isTextItem(lyric) && isItemRenderEnabled(lyric)),
    [lyricTexts]
  );
  const currentLyricIndex: number | undefined = useMemo(
    () => getCurrentLyricIndex(renderedLyricTexts, position),
    [position, renderedLyricTexts]
  );
  const scrollAnchorIndex: number | undefined = useMemo(() => {
    for (let index = renderedLyricTexts.length - 1; index >= 0; index -= 1) {
      if (position >= renderedLyricTexts[index].start) {
        return index;
      }
    }

    return undefined;
  }, [position, renderedLyricTexts]);
  const [lyricHeights, setLyricHeights] = useState<number[]>([]);
  const [currentScrollHeight, setCurrentScrollHeight] = useState<number>(0);
  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fontSize = useMemo(() => calculateFontSize(width, height), [width, height]);
  const padding = useMemo(() => calculatePadding(width, height), [width, height]);
  const cumulativeHeights = useMemo(() => {
    const offsets: number[] = [];
    let totalHeight = 0;

    for (let index = 0; index < lyricHeights.length; index += 1) {
      offsets[index] = totalHeight;
      totalHeight += lyricHeights[index] || 0;
      totalHeight += LYRIC_LINE_GAP;
    }

    return offsets;
  }, [lyricHeights]);

  useEffect(() => {
    setCurrentScrollHeight(
      scrollAnchorIndex !== undefined ? cumulativeHeights[scrollAnchorIndex] ?? 0 : 0
    );
  }, [cumulativeHeights, scrollAnchorIndex]);

  useEffect(() => {
    if (lyricRefs.current.length > 0) {
      const newHeights = lyricRefs.current.map(
        (lyricRef) => lyricRef?.getBoundingClientRect().height ?? 0
      );

      setLyricHeights((currentHeights) => {
        if (
          currentHeights.length === newHeights.length &&
          currentHeights.every((heightValue, index) => heightValue === newHeights[index])
        ) {
          return currentHeights;
        }

        return newHeights;
      });
    }
  }, [renderedLyricTexts, width, height]);

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
        WebkitMaskImage: EDGE_FADE_MASK,
        maskImage: EDGE_FADE_MASK,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "25%",
          width: "100%",
          paddingLeft: "25%",
          paddingRight: "25%",
        }}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -currentScrollHeight }}
          transition={{ ease: "easeInOut", duration: SCROLL_DURATION }}
        >
          {renderedLyricTexts.map((lyric, index) => (
            <div
              key={index}
              ref={(el) => {
                lyricRefs.current[index] = el;
              }}
              data-lyric-line
              data-lyric-active={currentLyricIndex === index ? "true" : "false"}
              style={{
                fontFamily: "Inter Variable",
                padding,
                fontSize: `${fontSize}px`,
                fontWeight: "bolder",
                backgroundColor: "transparent",
                marginBottom: `${LYRIC_LINE_GAP}px`,
                opacity: lyric.itemOpacity ?? 1,
                color:
                  currentLyricIndex === index
                    ? "rgba(255, 255, 255, 1)"
                    : "rgba(255, 255, 255, 0.14)",
                transition: "color 0.5s ease",
                willChange: currentLyricIndex === index ? "color" : undefined,
              }}
            >
              {lyric.text}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
