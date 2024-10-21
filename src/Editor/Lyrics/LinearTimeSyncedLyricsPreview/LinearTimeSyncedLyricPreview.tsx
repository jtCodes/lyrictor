import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface Lyric {
  time: number;
  text: string;
}

const lyrics: Lyric[] = [
  { time: 0, text: "First line of the song" },
  {
    time: 5,
    text: "This is the second line which is a bit longer and might wrap into multiple lines depending on the width.",
  },
  { time: 10, text: "Third line of the song" },
  {
    time: 15,
    text: "Fourth line of the song with more text to simulate multi-line behavior",
  },
  { time: 20, text: "Another lyric line that might wrap" },
  { time: 25, text: "Final line of the song" },
];

const scrollDuration = 0.5;

export function TimeSyncedLyrics({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [lyricHeights, setLyricHeights] = useState<{ [key: number]: number }>(
    {}
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prevTime) => prevTime + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const index = lyrics.findIndex((lyric) => currentTime < lyric.time);
    setCurrentLyricIndex(
      index === -1 ? lyrics.length - 1 : Math.max(0, index - 1)
    );
  }, [currentTime]);

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
  }, [currentLyricIndex]);

  const getCumulativeHeight = (index: number) => {
    let totalHeight = 0;
    for (let i = 0; i < index; i++) {
      totalHeight += lyricHeights[i] || 0;
      totalHeight += 10
    }
    return totalHeight;
  };

  return (
    <div
      style={{ overflowY: "hidden", height, width, position: "relative" }}
      ref={containerRef}
    >
      <div style={{ position: "absolute", top: "40px", width: "100%" }}>
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -getCumulativeHeight(currentLyricIndex) }}
          transition={{ ease: "easeOut", duration: scrollDuration }}
        >
          {lyrics.map((lyric, index) => (
            <div
              key={index}
              ref={(el) => (lyricRefs.current[index] = el)}
              style={{
                padding: "10px",
                color: currentLyricIndex === index ? "#fff" : "#888",
                fontSize: "20px",
                backgroundColor:
                  currentLyricIndex === index ? "#000" : "transparent",
                marginBottom: "10px",
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
