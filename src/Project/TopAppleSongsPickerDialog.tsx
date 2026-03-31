import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
  ProgressCircle,
  Text,
  View,
} from "@adobe/react-spectrum";
import Pause from "@spectrum-icons/workflow/Pause";
import Play from "@spectrum-icons/workflow/Play";
import { AppleMusicTopSong } from "./appleMusic";

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
  onUseSong: () => void;
}) {
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <span />
      <Dialog>
        <Heading>Choose a Song to Start With</Heading>
        <Divider />
        <Content>
          <View marginBottom="size-200">
            <Text UNSAFE_style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
              Browse the full list of recent picks and choose one to build your project around.
            </Text>
          </View>
          <div aria-label="Songs" role="listbox">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 520,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {songs.map((song) => {
                const isSelected = selectedSongId === song.id;

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
                      onClick={() => onSelectedSongChange(song.id)}
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
          <Button variant="cta" onPress={onUseSong}>
            Use Song
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  );
}