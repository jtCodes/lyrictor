import { ActionButton, Flex, ProgressCircle, Text, View } from "@adobe/react-spectrum";
import Pause from "@spectrum-icons/workflow/Pause";
import Play from "@spectrum-icons/workflow/Play";
import { useEffect, useState } from "react";
import { AppleMusicTopSong } from "./appleMusic";

export default function TopAppleSongsCarousel({
  songs,
  onBrowseTopAppleSongs,
  onTopAppleSongPress,
  onPreviewTopAppleSongPress,
  previewingTopAppleSongId,
  loadingTopAppleSongPreviewId,
  isLoadingTopAppleSongs,
}: {
  songs?: AppleMusicTopSong[];
  onBrowseTopAppleSongs?: () => void;
  onTopAppleSongPress?: (song: AppleMusicTopSong) => void | Promise<void>;
  onPreviewTopAppleSongPress?: (song: AppleMusicTopSong) => void | Promise<void>;
  previewingTopAppleSongId?: string;
  loadingTopAppleSongPreviewId?: string;
  isLoadingTopAppleSongs?: boolean;
}) {
  const carouselSongs = songs?.slice(0, 5) ?? [];
  const [topSongCarouselIndex, setTopSongCarouselIndex] = useState(0);

  useEffect(() => {
    if (carouselSongs.length === 0) {
      setTopSongCarouselIndex(0);
      return;
    }

    setTopSongCarouselIndex((currentIndex) =>
      Math.min(currentIndex, carouselSongs.length - 1)
    );
  }, [carouselSongs.length]);

  const activeCarouselSong = carouselSongs[topSongCarouselIndex];
  const carouselFrameStyle = {
    minHeight: 108,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <View marginBottom="size-250">
      <Flex direction="column" gap="size-125">
        <Flex alignItems="center" justifyContent="space-between" gap="size-150">
          <Text UNSAFE_style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600 }}>
            Don&apos;t have a song in mind? Pick one of these to try out.
          </Text>
          {songs && songs.length > 0 ? (
            <ActionButton isQuiet onPress={onBrowseTopAppleSongs}>
              <Text UNSAFE_style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: 600 }}>
                Browse Full List
              </Text>
            </ActionButton>
          ) : null}
        </Flex>
        <div style={carouselFrameStyle}>
          {isLoadingTopAppleSongs ? (
            <Flex alignItems="center" gap="size-100">
              <ProgressCircle aria-label="Loading suggested songs" isIndeterminate size="S" />
              <Text UNSAFE_style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
                Loading top songs...
              </Text>
            </Flex>
          ) : activeCarouselSong ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <ActionButton
                isQuiet
                aria-label="Show previous song suggestion"
                isDisabled={carouselSongs.length <= 1}
                onPress={() => {
                  setTopSongCarouselIndex((currentIndex) =>
                    currentIndex === 0 ? carouselSongs.length - 1 : currentIndex - 1
                  );
                }}
              >
                <Text UNSAFE_style={{ color: "rgba(255,255,255,0.82)", fontSize: 18, fontWeight: 600 }}>
                  ‹
                </Text>
              </ActionButton>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                  minWidth: 0,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.09)",
                }}
              >
                {activeCarouselSong.artworkUrl100 ? (
                  <img
                    src={activeCarouselSong.artworkUrl100}
                    alt=""
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.08)",
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.92)",
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeCarouselSong.name}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.56)",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 2,
                    }}
                  >
                    {activeCarouselSong.artistName}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ActionButton
                    isQuiet
                    aria-label={
                      previewingTopAppleSongId === activeCarouselSong.id
                        ? `Pause preview for ${activeCarouselSong.name}`
                        : `Preview ${activeCarouselSong.name}`
                    }
                    onPress={() => {
                      void onPreviewTopAppleSongPress?.(activeCarouselSong);
                    }}
                  >
                    {loadingTopAppleSongPreviewId === activeCarouselSong.id ? (
                      <ProgressCircle
                        aria-label={`Loading preview for ${activeCarouselSong.name}`}
                        isIndeterminate
                        size="S"
                      />
                    ) : previewingTopAppleSongId === activeCarouselSong.id ? (
                      <Pause />
                    ) : (
                      <Play />
                    )}
                  </ActionButton>
                  <ActionButton
                    isQuiet
                    aria-label={`Use ${activeCarouselSong.name}`}
                    onPress={() => {
                      void onTopAppleSongPress?.(activeCarouselSong);
                    }}
                  >
                    <Text UNSAFE_style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: 600 }}>
                      Use
                    </Text>
                  </ActionButton>
                </div>
              </div>
              <ActionButton
                isQuiet
                aria-label="Show next song suggestion"
                isDisabled={carouselSongs.length <= 1}
                onPress={() => {
                  setTopSongCarouselIndex((currentIndex) =>
                    currentIndex === carouselSongs.length - 1 ? 0 : currentIndex + 1
                  );
                }}
              >
                <Text UNSAFE_style={{ color: "rgba(255,255,255,0.82)", fontSize: 18, fontWeight: 600 }}>
                  ›
                </Text>
              </ActionButton>
            </div>
            {carouselSongs.length > 1 ? (
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                {carouselSongs.map((song, index) => (
                  <button
                    key={song.id}
                    type="button"
                    aria-label={`Show suggestion ${index + 1}`}
                    aria-pressed={index === topSongCarouselIndex}
                    onClick={() => {
                      setTopSongCarouselIndex(index);
                    }}
                    style={{
                      width: index === topSongCarouselIndex ? 18 : 8,
                      height: 8,
                      borderRadius: 999,
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      background:
                        index === topSongCarouselIndex
                          ? "rgba(255,255,255,0.88)"
                          : "rgba(255,255,255,0.22)",
                      transition: "all 0.18s ease",
                    }}
                  />
                ))}
              </div>
            ) : null}
            </div>
          ) : null}
        </div>
      </Flex>
    </View>
  );
}