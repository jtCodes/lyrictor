import { Flex, Grid, Text, View, ActionButton } from "@adobe/react-spectrum";
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
import ViewGrid from "@spectrum-icons/workflow/ViewGrid";
import GraphBullet from "@spectrum-icons/workflow/GraphBullet";
import githubIcon from "../github-mark.png";
import { useProjectService } from "../Project/useProjectService";
import { useWindowSize } from "../utils";
import FixedResolutionUpgradeNotice from "../Project/Notice/FixedResolutionUpgrade";
import LyricsSidePanel from "./Lyrics/LyricsSidePanel";
import { Resizable } from "re-resizable";
import SettingsSidePanel from "./Lyrics/SettingsSidePanel";

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const editingProject = useProjectStore((state) => state.editingProject);
  const leftSidePanelMaxWidth = useProjectStore(
    (state) => state.leftSidePanelMaxWidth
  );
  const setLeftSidePanelMaxWidth = useProjectStore(
    (state) => state.setLeftSidePanelMaxWidth
  );
  const rightSidePanelMaxWidth = useProjectStore(
    (state) => state.rightSidePanelMaxWidth
  );
  const setRightSidePanelMaxWidth = useProjectStore(
    (state) => state.setRightSidePanelMaxWidth
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
  const [leftSidePanelResizeStartWidth, setLeftSidePanelResizeStartWidth] =
    useState(0);
  const [rightSidePanelResizeStartWidth, setRightSidePanelResizeStartWidth] =
    useState(0);
  const [isLeftSidePanelVisible, setIsLeftSidePanelVisible] = useState(true);
  const [isRightSidePanelVisible, setIsRightSidePanelVisible] = useState(true);

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

  const handleLeftSidePanelVisibilityToggleClick = () => {
    setIsLeftSidePanelVisible(!isLeftSidePanelVisible);
  };

  const handleRightSidePanelVisibilityToggleClick = () => {
    setIsRightSidePanelVisible(!isRightSidePanelVisible);
  };

  function getLyricsPreviewWindowWidth() {
    let sidePanelWidth = 20;

    if (isLeftSidePanelVisible) {
      sidePanelWidth += leftSidePanelMaxWidth;
    }

    if (isRightSidePanelVisible) {
      sidePanelWidth += rightSidePanelMaxWidth;
    }

    return (windowWidth ?? 0) - sidePanelWidth;
  }

  return (
    <Grid
      areas={["header", "content", "footer"]}
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
          <View marginStart={15}>
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
            <View marginStart={10}>
              <ActionButton
                isQuiet={!isLeftSidePanelVisible}
                onPressUp={handleLeftSidePanelVisibilityToggleClick}
              >
                <ViewGrid />
              </ActionButton>
            </View>
            <View marginStart={10} marginEnd={10}>
              <ActionButton
                isQuiet={!isRightSidePanelVisible}
                onPressUp={handleRightSidePanelVisibilityToggleClick}
              >
                <GraphBullet />
              </ActionButton>
            </View>
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
      <Flex height={"100%"} justifyContent={"space-between"} gap={0}>
        <View>
          <Resizable
            size={{
              width: isLeftSidePanelVisible ? leftSidePanelMaxWidth : 0,
              height: "100%",
            }}
            defaultSize={{
              width: leftSidePanelMaxWidth,
            }}
            minWidth={isLeftSidePanelVisible ? 350 : 0}
            minHeight={"100%"}
            onResizeStart={() => {
              setLeftSidePanelResizeStartWidth(leftSidePanelMaxWidth);
            }}
            onResize={(e, direction, ref, d) => {
              setLeftSidePanelMaxWidth(leftSidePanelResizeStartWidth + d.width);
            }}
          >
            <View backgroundColor="gray-75" overflow={"hidden"} height={"100%"}>
              <LyricsSidePanel
                maxRowHeight={LYRIC_PREVIEW_ROW_HEIGHT}
                containerWidth={
                  isLeftSidePanelVisible ? leftSidePanelMaxWidth : 0
                }
              />
            </View>
          </Resizable>
        </View>
        <View>
          <LyricPreview
            maxHeight={LYRIC_PREVIEW_ROW_HEIGHT}
            maxWidth={getLyricsPreviewWindowWidth()}
            resolution={editingProject?.resolution}
          />
        </View>
        <View>
          <Resizable
            size={{
              width: isRightSidePanelVisible ? rightSidePanelMaxWidth : 0,
              height: "100%",
            }}
            defaultSize={{
              width: rightSidePanelMaxWidth,
            }}
            minWidth={isRightSidePanelVisible ? 350 : 0}
            minHeight={"100%"}
            onResizeStart={() => {
              setRightSidePanelResizeStartWidth(rightSidePanelMaxWidth);
            }}
            onResize={(e, direction, ref, d) => {
              setRightSidePanelMaxWidth(
                rightSidePanelResizeStartWidth + d.width
              );
            }}
          >
            <View backgroundColor="gray-75" height={"100%"}>
              <SettingsSidePanel
                maxRowHeight={LYRIC_PREVIEW_ROW_HEIGHT}
                containerWidth={
                  isRightSidePanelVisible ? rightSidePanelMaxWidth : 0
                }
              />
            </View>
          </Resizable>
        </View>
      </Flex>
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
