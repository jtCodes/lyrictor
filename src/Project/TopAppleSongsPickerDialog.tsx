import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Heading,
  Radio,
  RadioGroup,
  Text,
  View,
} from "@adobe/react-spectrum";
import { AppleMusicTopSong } from "./appleMusic";

export default function TopAppleSongsPickerDialog({
  isOpen,
  onOpenChange,
  songs,
  selectedSongId,
  onSelectedSongChange,
  onUseSong,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  songs: AppleMusicTopSong[];
  selectedSongId?: string;
  onSelectedSongChange: (songId: string) => void;
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
          <RadioGroup label="Songs" value={selectedSongId} onChange={onSelectedSongChange}>
            {songs.map((song) => (
              <Radio key={song.id} value={song.id}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                    paddingTop: 2,
                    paddingBottom: 2,
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
              </Radio>
            ))}
          </RadioGroup>
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