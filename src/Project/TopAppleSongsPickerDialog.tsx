import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Flex,
  Heading,
  ProgressCircle,
  Text,
  TextField,
  View,
} from "@adobe/react-spectrum";
import Pause from "@spectrum-icons/workflow/Pause";
import Play from "@spectrum-icons/workflow/Play";
import { useEffect, useMemo, useState } from "react";
import { AppleMusicTopSong, searchAppleMusicSongs } from "./appleMusic";

export default function TopAppleSongsPickerDialog({
  isOpen,
  onOpenChange,
  songs,
  selectedSongId,
  onSelectedSongChange,
  onPreviewSong,
  previewingSongId,
  loadingPreviewSongId,
  onUseSong,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  songs: AppleMusicTopSong[];
  selectedSongId?: string;
  onSelectedSongChange: (songId: string) => void;
  onPreviewSong: (song: AppleMusicTopSong) => void | Promise<void>;
  previewingSongId?: string;
  loadingPreviewSongId?: string;
  onUseSong: (song: AppleMusicTopSong) => void | Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppleMusicTopSong[]>([]);
  const [searchSelectedSongId, setSearchSelectedSongId] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSearchSelectedSongId(undefined);
      setSearchError(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchSelectedSongId(undefined);
      setSearchError(undefined);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    setSearchError(undefined);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchAppleMusicSongs(trimmedQuery, "us", 20);

        if (isCancelled) {
          return;
        }

        setSearchResults(results);
        setSearchSelectedSongId((currentValue) => {
          if (currentValue && results.some((song) => song.id === currentValue)) {
            return currentValue;
          }

          return results[0]?.id;
        });
        if (results.length === 0) {
          setSearchError("No songs found.");
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error("Failed to search Apple Music songs:", error);
        setSearchResults([]);
        setSearchSelectedSongId(undefined);
        setSearchError("Search failed.");
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const isShowingSearchResults = searchQuery.trim().length >= 2;
  const displayedSongs = useMemo(
    () => (isShowingSearchResults ? searchResults : songs),
    [isShowingSearchResults, searchResults, songs]
  );
  const activeSelectedSongId = isShowingSearchResults ? searchSelectedSongId : selectedSongId;

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <span />
      <Dialog>
        <Heading>Browse or Search Songs</Heading>
        <Divider />
        <Content>
          <Flex direction="column" gap="size-200">
            <TextField
              label="Search Apple Music"
              placeholder="Search by song or artist"
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <Flex alignItems="center" gap="size-100">
              <Text UNSAFE_style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
                {isShowingSearchResults
                  ? "Search results with preview-ready tracks."
                  : "Browse recent picks or search for a specific song."}
              </Text>
              {isSearching ? (
                <ProgressCircle aria-label="Searching songs" isIndeterminate size="S" />
              ) : null}
            </Flex>
          </Flex>
          <div aria-label="Songs" role="listbox">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 16,
              }}
            >
              {displayedSongs.length === 0 && isSearching ? (
                <Flex alignItems="center" gap="size-100" justifyContent="center">
                  <ProgressCircle aria-label="Searching songs" isIndeterminate size="S" />
                  <Text UNSAFE_style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
                    Searching...
                  </Text>
                </Flex>
              ) : displayedSongs.length === 0 ? (
                <Text UNSAFE_style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
                  {searchError ?? (isShowingSearchResults ? "No songs found." : "Recent picks are still loading. You can search right away.")}
                </Text>
              ) : displayedSongs.map((song) => {
                const isSelected = activeSelectedSongId === song.id;

                return (
                  <div
                    key={song.id}
                    role="option"
                    aria-selected={isSelected}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isShowingSearchResults) {
                          setSearchSelectedSongId(song.id);
                          return;
                        }

                        onSelectedSongChange(song.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        minWidth: 0,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isSelected
                          ? "1px solid rgba(255, 255, 255, 0.28)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        background: isSelected
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.03)",
                        boxShadow: isSelected
                          ? "inset 0 1px 0 rgba(255,255,255,0.04)"
                          : "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          flexShrink: 0,
                          background: isSelected
                            ? "rgba(255,255,255,0.92)"
                            : "rgba(255,255,255,0.22)",
                          boxShadow: isSelected
                            ? "0 0 0 4px rgba(255,255,255,0.08)"
                            : "none",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.92)",
                            fontSize: 15,
                            fontWeight: 600,
                            lineHeight: 1.25,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {song.name}
                        </span>
                        <span
                          style={{
                            color: "rgba(255,255,255,0.58)",
                            fontSize: 12,
                            lineHeight: 1.3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {song.artistName}
                        </span>
                      </div>
                    </button>
                    <ActionButton
                      isQuiet
                      aria-label={
                        previewingSongId === song.id
                          ? `Pause preview for ${song.name}`
                          : `Preview ${song.name}`
                      }
                      onPress={() => {
                        void onPreviewSong(song);
                      }}
                      UNSAFE_style={{ flexShrink: 0 }}
                    >
                      {loadingPreviewSongId === song.id ? (
                        <ProgressCircle aria-label={`Loading preview for ${song.name}`} isIndeterminate size="S" />
                      ) : previewingSongId === song.id ? (
                        <Pause />
                      ) : (
                        <Play />
                      )}
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </div>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onPress={() => {
              const selectedSong = displayedSongs.find((song) => song.id === activeSelectedSongId);

              if (!selectedSong) {
                return;
              }

              void onUseSong(selectedSong);
            }}
          >
            Use Song
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  );
}