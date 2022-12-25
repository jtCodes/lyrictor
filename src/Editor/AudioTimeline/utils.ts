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
