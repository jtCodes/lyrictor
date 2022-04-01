import { Flex, Grid, View, Text } from "@adobe/react-spectrum";
import { User } from "firebase/auth";
import { useEffect } from "react";
import { useAudioPlayer } from "react-use-audio-player";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../CreateProject/CreateNewProjectButton";
import LoadProjectListButton from "../CreateProject/LoadProjectListButton";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview";
const localUrl = require("../local.mp3");

export default function LyricEditor({ user }: { user: User }) {
  const url = localUrl;
  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const width = 2500;
  const height = 230;

  const { togglePlayPause, ready, loading, playing, pause, player } =
    useAudioPlayer({
      src: url,
      format: [],
      autoplay: false,
      onend: () => console.log("sound has ended!"),
    });

  useEffect(() => {
    if (player) {
      console.log(player);
    }
  }, []);

  return (
    <Grid
      areas={["header  header", "sidebar content", "footer  footer"]}
      columns={["1fr", "3fr"]}
      rows={["size-600", "1fr", "auto"]}
      minHeight={"100vh"}
      minWidth={"100vw"}
      gap="size-100"
    >
      <View backgroundColor="gray-300" gridArea="header">
        <Flex
          direction="row"
          height="size-600"
          gap="size-100"
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            <View marginStart={15} marginEnd={5}>
              <LoadProjectListButton />
            </View>
            <View marginEnd={15}>
              <CreateNewProjectButton />
            </View>
          </Flex>
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            <View marginEnd={10}>
              <Text>{user.displayName}</Text>
            </View>
            <View marginEnd={15}>
              <LogOutButton />
            </View>
          </Flex>
        </Flex>
      </View>
      <View backgroundColor="blue-600" gridArea="sidebar" />
      <View backgroundColor="purple-600" gridArea="content">
        <LyricPreview />
      </View>
      <View gridArea="footer">
        <AudioTimeline
          width={width}
          height={height}
          url={url}
          togglePlayPause={togglePlayPause}
          playing={playing}
        />
      </View>
    </Grid>
  );
}
