import WaveformData from "waveform-data";
import { LyricText } from "../types";
import { scaleY } from "../utils";
import { fetchMediaArrayBuffer } from "../../runtime";

export function getVisibleSongRange({
  width,
  windowWidth,
  duration,
  scrollXOffSet,
}: {
  width: number;
  windowWidth: number | undefined;
  duration: number;
  scrollXOffSet: number;
}): number[] {
  const from = (Math.abs(scrollXOffSet) / width) * duration;
  const to =
    ((Math.abs(scrollXOffSet) + (windowWidth ?? 0)) / width) * duration;
  return [from, to];
}

const GRAPH_HEIGHT = 90;

export async function generateWaveformData(
  url: string,
  audioContext: AudioContext
): Promise<WaveformData> {
  const buffer = await fetchMediaArrayBuffer(url);
  const options = {
    audio_context: audioContext,
    array_buffer: buffer,
    scale: 10000,
  };
  return await new Promise<WaveformData>((resolve, reject) => {
    WaveformData.createFromAudio(options, (err, waveform) => {
      if (err) {
        reject(err);
      } else {
        resolve(waveform);
      }
    });
  });
}

export function generateWaveformLinePoints(
  waveform: WaveformData,
  width: number
): number[] {
  const points: number[] = [];
  const yPadding = 30;

  const channel = waveform.channel(0);
  const xOffset = width / waveform.length;

  // Loop forwards, drawing the upper half of the waveform
  for (let x = 0; x < waveform.length; x++) {
    const val = channel.max_sample(x);
    points.push(
      x * xOffset,
      scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
    );
  }

  // Loop backwards, drawing the lower half of the waveform
  for (let x = waveform.length - 1; x >= 0; x--) {
    const val = channel.min_sample(x);
    points.push(
      x * xOffset,
      scaleY(val, GRAPH_HEIGHT - yPadding) + yPadding / 4
    );
  }

  return points;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function canMoveToLevel({
  item,
  targetLevel,
  itemsById,
}: {
  item: LyricText;
  targetLevel: number;
  itemsById: Map<number, LyricText>;
}) {
  for (const [candidateId, candidateItem] of itemsById.entries()) {
    if (candidateId === item.id) {
      continue;
    }

    if (candidateItem.textBoxTimelineLevel !== targetLevel) {
      continue;
    }

    if (
      intervalsOverlap(item.start, item.end, candidateItem.start, candidateItem.end)
    ) {
      return false;
    }
  }

  return true;
}

function applyTimelineLevelGravity(itemsById: Map<number, LyricText>) {
  let didMove = true;

  while (didMove) {
    didMove = false;

    const orderedItems = Array.from(itemsById.values()).sort((a, b) => {
      if (a.textBoxTimelineLevel !== b.textBoxTimelineLevel) {
        return a.textBoxTimelineLevel - b.textBoxTimelineLevel;
      }

      if (a.start !== b.start) {
        return a.start - b.start;
      }

      return a.id - b.id;
    });

    for (const item of orderedItems) {
      let nextLevel = item.textBoxTimelineLevel;

      while (nextLevel > 1) {
        const candidateLevel = nextLevel - 1;
        if (
          !canMoveToLevel({
            item: { ...item, textBoxTimelineLevel: candidateLevel },
            targetLevel: candidateLevel,
            itemsById,
          })
        ) {
          break;
        }

        nextLevel = candidateLevel;
      }

      if (nextLevel !== item.textBoxTimelineLevel) {
        itemsById.set(item.id, {
          ...item,
          textBoxTimelineLevel: nextLevel,
        });
        didMove = true;
      }
    }
  }
}

export function normalizeLyricTextTimelineLevels(
  lyricTexts: LyricText[]
): LyricText[] {
  const itemsById = new Map<number, LyricText>();

  lyricTexts.forEach((lyricText) => {
    itemsById.set(lyricText.id, { ...lyricText });
  });

  applyTimelineLevelGravity(itemsById);

  return lyricTexts.map((lyricText) => itemsById.get(lyricText.id) ?? lyricText);
}

export function getFirstNonOverlappingTimelineLevel({
  movingLyricText,
  lyricTexts,
  preferredLevel,
}: {
  movingLyricText: LyricText;
  lyricTexts: LyricText[];
  preferredLevel?: number;
}): number {
  const minLevel = Math.max(1, preferredLevel ?? 1);
  let level = minLevel;

  while (true) {
    const hasCollisionAtLevel = lyricTexts.some((lyricText) => {
      if (lyricText.id === movingLyricText.id) {
        return false;
      }

      if (lyricText.textBoxTimelineLevel !== level) {
        return false;
      }

      return intervalsOverlap(
        lyricText.start,
        lyricText.end,
        movingLyricText.start,
        movingLyricText.end
      );
    });

    if (!hasCollisionAtLevel) {
      return level;
    }

    level += 1;
  }
}

export function pushCollidingItemsUpFromLevel({
  lyricTexts,
  movingLyricTextId,
  preferredLevel,
}: {
  lyricTexts: LyricText[];
  movingLyricTextId: number;
  preferredLevel: number;
}): LyricText[] {
  const itemsById = new Map<number, LyricText>();

  lyricTexts.forEach((lyricText) => {
    itemsById.set(lyricText.id, { ...lyricText });
  });

  const movingLyricText = itemsById.get(movingLyricTextId);
  if (!movingLyricText) {
    return lyricTexts;
  }

  movingLyricText.textBoxTimelineLevel = Math.max(1, preferredLevel);
  itemsById.set(movingLyricTextId, movingLyricText);

  const queue: number[] = [movingLyricTextId];

  while (queue.length > 0) {
    const sourceId = queue.shift();
    if (sourceId === undefined) {
      break;
    }

    const sourceItem = itemsById.get(sourceId);
    if (!sourceItem) {
      continue;
    }

    for (const [candidateId, candidateItem] of itemsById.entries()) {
      if (candidateId === sourceId) {
        continue;
      }

      const isSameLevel =
        candidateItem.textBoxTimelineLevel === sourceItem.textBoxTimelineLevel;
      if (!isSameLevel) {
        continue;
      }

      const isColliding = intervalsOverlap(
        sourceItem.start,
        sourceItem.end,
        candidateItem.start,
        candidateItem.end
      );

      if (!isColliding) {
        continue;
      }

      const movedCandidate: LyricText = {
        ...candidateItem,
        textBoxTimelineLevel: candidateItem.textBoxTimelineLevel + 1,
      };
      itemsById.set(candidateId, movedCandidate);
      queue.push(candidateId);
    }
  }

  applyTimelineLevelGravity(itemsById);

  return lyricTexts.map((lyricText) => itemsById.get(lyricText.id) ?? lyricText);
}

export function pushCollidingItemsUpFromLevels({
  lyricTexts,
  movingLyricTextIds,
}: {
  lyricTexts: LyricText[];
  movingLyricTextIds: number[];
}): LyricText[] {
  const itemsById = new Map<number, LyricText>();
  const movingLyricTextIdSet = new Set(movingLyricTextIds);

  lyricTexts.forEach((lyricText) => {
    itemsById.set(lyricText.id, { ...lyricText });
  });

  const movingLyricTexts = movingLyricTextIds
    .map((movingLyricTextId) => itemsById.get(movingLyricTextId))
    .filter((lyricText): lyricText is LyricText => Boolean(lyricText));

  if (movingLyricTexts.length === 0) {
    return lyricTexts;
  }

  const groupStart = Math.min(...movingLyricTexts.map((lyricText) => lyricText.start));
  const groupEnd = Math.max(...movingLyricTexts.map((lyricText) => lyricText.end));
  const minGroupLevel = Math.min(
    ...movingLyricTexts.map((lyricText) => lyricText.textBoxTimelineLevel)
  );
  const maxGroupLevel = Math.max(
    ...movingLyricTexts.map((lyricText) => lyricText.textBoxTimelineLevel)
  );
  const groupHeight = maxGroupLevel - minGroupLevel + 1;

  const queue: number[] = [];

  for (const [candidateId, candidateItem] of itemsById.entries()) {
    if (movingLyricTextIdSet.has(candidateId)) {
      continue;
    }

    const overlapsGroupLevels =
      candidateItem.textBoxTimelineLevel >= minGroupLevel &&
      candidateItem.textBoxTimelineLevel <= maxGroupLevel;
    if (!overlapsGroupLevels) {
      continue;
    }

    const overlapsGroupTime = intervalsOverlap(
      groupStart,
      groupEnd,
      candidateItem.start,
      candidateItem.end
    );
    if (!overlapsGroupTime) {
      continue;
    }

    const movedCandidate: LyricText = {
      ...candidateItem,
      textBoxTimelineLevel: candidateItem.textBoxTimelineLevel + groupHeight,
    };
    itemsById.set(candidateId, movedCandidate);
    queue.push(candidateId);
  }

  while (queue.length > 0) {
    const sourceId = queue.shift();
    if (sourceId === undefined) {
      break;
    }

    const sourceItem = itemsById.get(sourceId);
    if (!sourceItem) {
      continue;
    }

    for (const [candidateId, candidateItem] of itemsById.entries()) {
      if (candidateId === sourceId || movingLyricTextIdSet.has(candidateId)) {
        continue;
      }

      const isSameLevel =
        candidateItem.textBoxTimelineLevel === sourceItem.textBoxTimelineLevel;
      if (!isSameLevel) {
        continue;
      }

      const isColliding = intervalsOverlap(
        sourceItem.start,
        sourceItem.end,
        candidateItem.start,
        candidateItem.end
      );

      if (!isColliding) {
        continue;
      }

      const movedCandidate: LyricText = {
        ...candidateItem,
        textBoxTimelineLevel: candidateItem.textBoxTimelineLevel + 1,
      };
      itemsById.set(candidateId, movedCandidate);
      queue.push(candidateId);
    }
  }

  applyTimelineLevelGravity(itemsById);

  return lyricTexts.map((lyricText) => itemsById.get(lyricText.id) ?? lyricText);
}
