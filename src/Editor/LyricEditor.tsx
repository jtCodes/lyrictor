import { Flex, Grid, Text, View } from "@adobe/react-spectrum";
import { useWindowHeight } from "@react-hook/window-size";
import { User } from "firebase/auth";
import { useEffect } from "react";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../Project/CreateNewProjectButton";
import LoadProjectListButton from "../Project/LoadProjectListButton";
import SaveButton from "../Project/SaveButton";
import { loadProjects, useProjectStore } from "../Project/store";
import { ProjectDetail } from "../Project/types";
import { sample } from "../sampledata";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview";
import LyricsView from "./Lyrics/LyricsVIew";

export default function LyricEditor({ user }: { user?: User }) {
  const windowHeight = useWindowHeight();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);

  const setExistingProjects = useProjectStore((state) => state.setExistingProjects); 
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const width = 2500;
  const headerRowHeight = 120;
  const timelineVisibleHeight = 260;
  const contentRowHeight =
    windowHeight - (headerRowHeight + timelineVisibleHeight);

  useEffect(() => {
    setExistingProjects(loadProjects())
    setEditingProject(sample[0].projectDetail as unknown as ProjectDetail);
    setLyricReference(sample[0].lyricReference);
    setLyricTexts(sample[0].lyricTexts);
  }, []);

  return (
    <Grid
      areas={["header  header", "content content", "footer  footer"]}
      columns={["3fr"]}
      rows={["size-600", contentRowHeight + "px", "auto"]}
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
            <View marginStart={10} marginEnd={5}>
              <LoadProjectListButton />
            </View>
            <View marginEnd={5}>
              <CreateNewProjectButton />
            </View>
          </Flex>
          <Text>{editingProject?.name}</Text>
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            {user ? (
              <>
                {" "}
                <View marginEnd={10}>
                  <Text>{user?.displayName}</Text>
                </View>
                <View marginEnd={15}>
                  <LogOutButton />
                </View>
              </>
            ) : null}
            <View marginEnd={10}>
              <SaveButton />
            </View>
          </Flex>
        </Flex>
      </View>

      <View
        backgroundColor="gray-75"
        overflow={"auto"}
        height={contentRowHeight + "px"}
        width={500}
      >
        {lyricReference !== undefined ? (
          <LyricsView key={editingProject?.name} />
        ) : null}
      </View>
      <View>
        <LyricPreview height={contentRowHeight} />
      </View>

      <View gridArea="footer">
        {editingProject?.audioFileUrl ? (
          <AudioTimeline
            width={width}
            height={timelineVisibleHeight}
            url={editingProject?.audioFileUrl}
          />
        ) : null}
      </View>
    </Grid>
  );
}
