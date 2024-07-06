import { Flex, Grid, Text, View } from "@adobe/react-spectrum";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import LogOutButton from "../Auth/LogOutButton";
import CreateNewProjectButton from "../Project/CreateNewProjectButton";
import LoadProjectListButton from "../Project/LoadProjectListButton";
import { loadProjects, useProjectStore } from "../Project/store";
import AudioTimeline from "./AudioTimeline/AudioTimeline";
import LyricPreview from "./Lyrics/LyricPreview/LyricPreview";
import { Dropdown } from "flowbite-react";
import Add from "@spectrum-icons/workflow/Add";
import githubIcon from "../github-mark.png";
import { useProjectService } from "../Project/useProjectService";
import { useWindowSize } from "../utils";
import FixedResolutionUpgradeNotice from "../Project/Notice/FixedResolutionUpgrade";
import LyricsSidePanel from "./Lyrics/LyricsSidePanel";
import { Resizable } from "re-resizable";

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReferenceMaxWidth = useProjectStore(
    (state) => state.lyricReferenceMaxWidth
  );
  const setLyricReferenceMaxWidth = useProjectStore(
    (state) => state.setLyricReferenceMaxWidth
  );
  const lyricsPreviewMaxWidth = useProjectStore(
    (state) => state.lyricsPreviewMaxWidth
  );
  const setLyricsPreviewMaxWidth = useProjectStore(
    (state) => state.setLyricsPreviewMaxWidth
  );

  const [saveProject] = useProjectService();

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const isCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.isCreateNewProjectPopupOpen
  );
  const setIsCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );
  const setIsLoadProjectPopupOpen = useProjectStore(
    (state) => state.setIsLoadProjectPopupOpen
  );

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const INITIAL_TIMELINE_WIDTH = 2500;
  const HEADER_ROW_HEIGHT = 120;
  const TIMELINE_VISIBLE_HEIGHT = 260;
  const LYRIC_PREVIEW_ROW_HEIGHT =
    (windowHeight ?? 0) - (HEADER_ROW_HEIGHT + TIMELINE_VISIBLE_HEIGHT);

  const [shouldShowUpgradeNotice, setShouldShowUpgradeNotice] = useState(false);
  const [leftSidePanelResizeStartWidth, setLeftSidePanelResizeStartWidth] = useState(0)

  useEffect(() => {
    setExistingProjects(loadProjects());
  }, []);

  useEffect(() => {
    if (editingProject && !editingProject.resolution) {
      setShouldShowUpgradeNotice(true);
    }

    if (!editingProject && !isCreateNewProjectPopupOpen) {
      setIsLoadProjectPopupOpen(true);
    }
  }, [editingProject]);

  function isDemoProject() {
    return editingProject?.name.includes("(Demo)");
  }

  return (
    <Grid
      areas={["header  header", "content content", "footer  footer"]}
      columns={["3fr"]}
      rows={["size-600", LYRIC_PREVIEW_ROW_HEIGHT + "px", "auto"]}
      minHeight={"100vh"}
      minWidth={"100vw"}
      gap="size-100"
      UNSAFE_style={{ overflow: "hidden" }}
    >
      <FixedResolutionUpgradeNotice
        isOpen={shouldShowUpgradeNotice}
        onClose={() => {
          setShouldShowUpgradeNotice(false);
        }}
      />
      <CreateNewProjectButton hideButton={true} />
      <LoadProjectListButton hideButton={true} />
      <View backgroundColor="gray-300" gridArea="header">
        <Flex
          direction="row"
          height="size-600"
          gap="size-100"
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <View></View>
          <View>
            <Flex alignContent={"center"} justifyContent={"center"} gap={5}>
              {editingProject?.albumArtSrc ? (
                <View>
                  <img
                    height={35}
                    width={35}
                    style={{
                      objectFit: "contain",
                      border: "solid",
                      borderWidth: 1,
                      borderRadius: 2,
                      borderColor: "rgba(211,211,211, 0.15)",
                    }}
                    src={editingProject.albumArtSrc}
                  />
                </View>
              ) : null}
              <View alignSelf={"center"}>
                <Text>
                  <span style={{ fontWeight: 600 }}>
                    {editingProject?.name}
                  </span>
                </Text>
              </View>
            </Flex>
          </View>
          <Flex
            direction="row"
            justifyContent={"space-between"}
            alignItems={"center"}
          >
            {/* {user ? (
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
            ) : null} */}
            <View marginStart={10} marginEnd={10}>
              <Dropdown
                label={<Add aria-label="Options" size="S" />}
                size={"sm"}
                inline
              >
                <Dropdown.Item
                  onClick={() => setIsCreateNewProjectPopupOpen(true)}
                >
                  New Project
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setIsLoadProjectPopupOpen(true)}>
                  Load
                </Dropdown.Item>
                {!isDemoProject() && editingProject ? (
                  <Dropdown.Item
                    onClick={() => {
                      saveProject();
                    }}
                  >
                    Save
                  </Dropdown.Item>
                ) : null}
                <Dropdown.Divider />
                <Dropdown.Item
                  onClick={() => {
                    window.open("https://github.com/jtCodes/lyrictor");
                  }}
                >
                  <span>
                    <img src={githubIcon} height={18} width={18} />
                  </span>
                  <span style={{ marginLeft: 5 }}>Support</span>
                </Dropdown.Item>
              </Dropdown>
            </View>
          </Flex>
        </Flex>
      </View>
      <Resizable
        defaultSize={{ width: lyricReferenceMaxWidth }}
        minWidth={350}
        onResizeStart={() => {
          setLeftSidePanelResizeStartWidth(lyricReferenceMaxWidth)
        }}
        onResize={(e, direction, ref, d) => {
          setLyricReferenceMaxWidth(leftSidePanelResizeStartWidth + d.width);
        }}
      >
        <View backgroundColor="gray-75" overflow={"hidden"} height={"100%"}>
          <LyricsSidePanel
            maxRowHeight={LYRIC_PREVIEW_ROW_HEIGHT}
            containerWidth={lyricReferenceMaxWidth}
          />
        </View>
      </Resizable>
      <View>
        <LyricPreview
          maxHeight={LYRIC_PREVIEW_ROW_HEIGHT}
          maxWidth={(windowWidth ?? 0) - lyricsPreviewMaxWidth}
          resolution={editingProject?.resolution}
        />
      </View>
      <View gridArea="footer">
        {editingProject?.audioFileUrl ? (
          <AudioTimeline
            width={INITIAL_TIMELINE_WIDTH}
            height={TIMELINE_VISIBLE_HEIGHT}
            url={editingProject?.audioFileUrl}
          />
        ) : null}
      </View>
    </Grid>
  );
}
