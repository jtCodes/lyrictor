import { Flex, Grid, Text, View } from "@adobe/react-spectrum";
import { useWindowHeight } from "@react-hook/window-size";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import LogOutButton from "../../Auth/LogOutButton";
import CreateNewProjectButton from "../../Project/CreateNewProjectButton";
import { DataSource } from "../../Project/CreateNewProjectForm";
import LoadProjectListButton from "../../Project/LoadProjectListButton";
import SaveButton from "../../Project/SaveButton";
import { loadProjects, useProjectStore } from "../../Project/store";
import { ProjectDetail } from "../../Project/types";
import { sample } from "../../sampledata";
import { useYoutubeService } from "../../Youtube/useYoutubeService";
import AudioTimeline from "../AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview";
import LyricsView from "./LyricsVIew";

export default function LyricEditor({ user }: { user?: User }) {
  const windowHeight = useWindowHeight();

  const [getAudioStreamUrl] = useYoutubeService();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const setEditingProject = useProjectStore((state) => state.setEditingProject);
  const setLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const setLyricReference = useProjectStore((state) => state.setLyricReference);

  const [youtubeAudioStreamUrl, setYoutubeAudioStreamUrl] =
    useState<string | undefined>(undefined);

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const width = 2500;
  const headerRowHeight = 120;
  const timelineVisibleHeight = 260;
  const contentRowHeight =
    windowHeight - (headerRowHeight + timelineVisibleHeight);

  useEffect(() => {
    setExistingProjects(loadProjects());
    setEditingProject(sample[0].projectDetail as unknown as ProjectDetail);
    setLyricReference(sample[0].lyricReference);
    setLyricTexts(sample[0].lyricTexts);
  }, []);

  useEffect(() => {
    (async () => {
      if (editingProject && editingProject.dataSource === DataSource.youtube) {
        const url = await getAudioStreamUrl(editingProject.audioFileUrl);
        setYoutubeAudioStreamUrl(url);
      }
    })();
  }, [editingProject]);

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
          <Text>
            <span style={{ fontWeight: 600 }}>{editingProject?.name}</span>
          </Text>
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            {user ? (
              <>
                <View marginEnd={10}>
                  <Text>
                    <span>{user?.displayName}</span>
                  </Text>
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
        {editingProject?.dataSource !== DataSource.youtube &&
        editingProject?.audioFileUrl ? (
          <AudioTimeline
            width={width}
            height={timelineVisibleHeight}
            url={editingProject?.audioFileUrl}
          />
        ) : editingProject?.dataSource === DataSource.youtube &&
          youtubeAudioStreamUrl ? (
          <AudioTimeline
            width={width}
            height={timelineVisibleHeight}
            url={youtubeAudioStreamUrl}
          />
        ) : null}
      </View>
    </Grid>
  );
}
