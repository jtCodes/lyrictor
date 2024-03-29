import { Flex, Grid, Text, View } from "@adobe/react-spectrum";
import { useWindowHeight } from "@react-hook/window-size";
import { User } from "firebase/auth";
import { useEffect } from "react";
import LogOutButton from "../../Auth/LogOutButton";
import CreateNewProjectButton from "../../Project/CreateNewProjectButton";
import LoadProjectListButton from "../../Project/LoadProjectListButton";
import SaveButton from "../../Project/SaveButton";
import { loadProjects, useProjectStore } from "../../Project/store";
import AudioTimeline from "../AudioTimeline/AudioTimeline";
import LyricPreview from "./LyricPreview";
import LyricReferenceView from "./LyricReferenceView";
import { Dropdown } from "flowbite-react";
import Add from "@spectrum-icons/workflow/Add";
import githubIcon from "../../github-mark.png";
import { useProjectService } from "../../Project/useProjectService";

export default function LyricEditor({ user }: { user?: User }) {
  const windowHeight = useWindowHeight();

  const editingProject = useProjectStore((state) => state.editingProject);
  const lyricReference = useProjectStore((state) => state.lyricReference);

  const [saveProject] = useProjectService();

  const setExistingProjects = useProjectStore(
    (state) => state.setExistingProjects
  );
  const setIsCreateNewProjectPopupOpen = useProjectStore(
    (state) => state.setIsCreateNewProjectPopupOpen
  );
  const setIsLoadProjectPopupOpen = useProjectStore(
    (state) => state.setIsLoadProjectPopupOpen
  );

  // const url: string =
  //   "https://firebasestorage.googleapis.com/v0/b/anigo-67b0c.appspot.com/o/Dying%20Wish%20-%20Until%20Mourning%20Comes%20(Official%20Music%20Video).mp3?alt=media&token=1573cc50-6b33-4aea-b46c-9732497e9725";
  const width = 2500;
  const headerRowHeight = 120;
  const timelineVisibleHeight = 260;
  const contentRowHeight =
    windowHeight - (headerRowHeight + timelineVisibleHeight);

  useEffect(() => {
    setExistingProjects(loadProjects());
  }, []);

  function isDemoProject() {
    return editingProject?.name.includes("(Demo)");
  }

  return (
    <Grid
      areas={["header  header", "content content", "footer  footer"]}
      columns={["3fr"]}
      rows={["size-600", contentRowHeight + "px", "auto"]}
      minHeight={"100vh"}
      minWidth={"100vw"}
      gap="size-100"
    >
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
                {!isDemoProject() ? (
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
        height={contentRowHeight + "px"}
        width={500}
      >
        {lyricReference !== undefined ? (
          <LyricReferenceView key={editingProject?.name} />
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
