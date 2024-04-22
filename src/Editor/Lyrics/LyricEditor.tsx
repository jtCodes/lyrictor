import { Flex, Grid, Text, View } from "@adobe/react-spectrum";
import { useWindowHeight, useWindowWidth } from "@react-hook/window-size";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import LogOutButton from "../../Auth/LogOutButton";
import CreateNewProjectButton from "../../Project/CreateNewProjectButton";
import LoadProjectListButton from "../../Project/LoadProjectListButton";
import SaveButton from "../../Project/SaveButton";
import { loadProjects, useProjectStore } from "../../Project/store";
import AudioTimeline from "../AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview/LyricPreview";
import LyricReferenceView from "./LyricReferenceView";
import { Dropdown } from "flowbite-react";
import Add from "@spectrum-icons/workflow/Add";
import githubIcon from "../../github-mark.png";
import { useProjectService } from "../../Project/useProjectService";
import { useWindowSize } from "../../utils";
import FixedResolutionUpgradeNotice from "../../Project/Notice/FixedResolutionUpgrade";

export default function LyricEditor({ user }: { user?: User }) {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);

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
  const LYRIC_REFERENCE_VIEW_WIDTH = 450;
  const LYRIC_PREVIEW_ROW_HEIGHT =
    (windowHeight ?? 0) - (HEADER_ROW_HEIGHT + TIMELINE_VISIBLE_HEIGHT);
  const LYRIC_PREVIEW_MAX_WIDTH =
    (windowWidth ?? 0) - LYRIC_REFERENCE_VIEW_WIDTH - 20;

  const [shouldShowUpgradeNotice, setShouldShowUpgradeNotice] = useState(false);

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
            <Text>
              <span style={{ fontWeight: 600 }}>{editingProject?.name}</span>
            </Text>
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
      <View
        backgroundColor="gray-75"
        overflow={"auto"}
        height={LYRIC_PREVIEW_ROW_HEIGHT + "px"}
        width={LYRIC_REFERENCE_VIEW_WIDTH}
      >
        {lyricReference !== undefined ? (
          <LyricReferenceView key={editingProject?.name} />
        ) : null}
      </View>
      <View>
        <LyricPreview
          maxHeight={LYRIC_PREVIEW_ROW_HEIGHT}
          maxWidth={LYRIC_PREVIEW_MAX_WIDTH}
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
