import {
  ActionButton,
  Flex,
  Form,
  Radio,
  RadioGroup,
  Text,
  TextField,
  View,
} from "@adobe/react-spectrum";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { EditingMode, ProjectDetail, VideoAspectRatio } from "./types";
import ResolutionPicker from "./ResolutionPicker";
import EditingModePicker from "./EditingModePicker";


export enum DataSource {
  local = "local",
  stream = "stream",
}

export default function CreateNewProjectForm({
  creatingProject,
  setCreatingProject,
  selectedDataSource,
  setSelectedDataSource,
  audioUrlValid,
  onStreamUrlBlur,
  onRepickAppleTrack,
  isResolvingAppleMusic,
}: {
  creatingProject?: ProjectDetail;
  setCreatingProject: (project: ProjectDetail) => void;
  selectedDataSource: DataSource;
  setSelectedDataSource: (dataSource: DataSource) => void;
  audioUrlValid: boolean | null;
  onStreamUrlBlur?: (value: string) => void | Promise<void>;
  onRepickAppleTrack?: () => void;
  isResolvingAppleMusic?: boolean;
}) {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone();

  useEffect(() => {
    const file: any = acceptedFiles[0];
    if (file) {
      const now = new Date();
      setCreatingProject({
        name: creatingProject?.name ? creatingProject?.name : file.path,
        artistName: creatingProject?.artistName,
        songName: creatingProject?.songName,
        createdDate: creatingProject?.createdDate ?? now,
        updatedDate: now,
        audioFileName: file.path,
        audioFileUrl: URL.createObjectURL(file),
        isLocalUrl: true,
        resolution: creatingProject?.resolution ?? VideoAspectRatio["16/9"],
        editingMode: creatingProject?.editingMode ?? EditingMode.free,
      });
    }
  }, [acceptedFiles]);

  useEffect(() => {
    const now = new Date();
    setCreatingProject({
      name: creatingProject?.name ? creatingProject.name : "",
      artistName: creatingProject?.artistName,
      songName: creatingProject?.songName,
      createdDate: creatingProject?.createdDate ?? now,
      updatedDate: creatingProject?.updatedDate ?? now,
      audioFileName: "",
      audioFileUrl: "",
      isLocalUrl: selectedDataSource === DataSource.local,
      resolution: creatingProject?.resolution ?? VideoAspectRatio["16/9"],
      editingMode: creatingProject?.editingMode ?? EditingMode.free,
    });
  }, [selectedDataSource]);

  const files = acceptedFiles.map((file: any) => {
    localStorage.setItem("test", JSON.stringify(file.path));
    console.log(file, URL.createObjectURL(file));
    return <View key={file.path}>{file.path}</View>;
  });

  return (
    <section className="container">
      <Form maxWidth="size-4600" isRequired necessityIndicator="label">
        <RadioGroup
          label="Audio source"
          onChange={(value: any) => {
            setSelectedDataSource(value);
          }}
          value={selectedDataSource}
        >
          <Radio value={DataSource.local}>Local file</Radio>
          {selectedDataSource === DataSource.local ? (
            <div
              {...getRootProps({ className: "dropzone" })}
              style={{ cursor: "pointer" }}
            >
              <input {...getInputProps({ accept: "audio/*", type: "file" })} />{" "}
              <View
                marginStart={25}
                backgroundColor={"gray-200"}
                padding={5}
                borderRadius={"regular"}
              >
                <p>Drag 'n' drop an audio file, or click to select one</p>
                <h4>{files}</h4>
              </View>
            </div>
          ) : (
            <div></div>
          )}
          <Radio value={DataSource.stream}>Stream url</Radio>
          {selectedDataSource === DataSource.stream ? (
            <>
              <Flex alignItems="end" gap="size-100" marginStart={25}>
                <TextField
                  width="100%"
                  label="Url"
                  placeholder="Audio stream url"
                  value={creatingProject?.audioFileUrl ?? ""}
                  validationState={
                    audioUrlValid === null
                      ? undefined
                      : audioUrlValid
                        ? "valid"
                        : "invalid"
                  }
                  onChange={(value: string) => {
                    const now = new Date();
                    setCreatingProject({
                      name: creatingProject?.name ? creatingProject?.name : "",
                      artistName: creatingProject?.artistName,
                      songName: creatingProject?.songName,
                      createdDate: creatingProject?.createdDate ?? now,
                      updatedDate: now,
                      audioFileName: value,
                      audioFileUrl: value,
                      appleMusicAlbumUrl: undefined,
                      appleMusicTrackId: undefined,
                      appleMusicTrackName: undefined,
                      isLocalUrl: false,
                      editingMode: creatingProject?.editingMode ?? EditingMode.free,
                      resolution: creatingProject?.resolution,
                    });
                  }}
                  onBlur={() => {
                    if (creatingProject?.audioFileUrl) {
                      onStreamUrlBlur?.(creatingProject.audioFileUrl);
                    }
                  }}
                />
                {creatingProject?.appleMusicAlbumUrl && onRepickAppleTrack ? (
                  <ActionButton
                    isDisabled={isResolvingAppleMusic}
                    onPress={onRepickAppleTrack}
                    aria-label="Pick a different Apple Music track"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.05 12.536c-.027-2.934 2.397-4.341 2.507-4.408-1.365-1.995-3.486-2.269-4.23-2.301-1.803-.182-3.52 1.06-4.435 1.06-.913 0-2.326-1.033-3.822-1.005-1.966.03-3.78 1.145-4.79 2.904-2.044 3.54-.52 8.79 1.468 11.664.972 1.405 2.13 2.983 3.65 2.927 1.467-.058 2.02-.949 3.794-.949 1.774 0 2.273.949 3.822.914 1.58-.025 2.58-1.431 3.543-2.841 1.118-1.636 1.579-3.222 1.606-3.305-.034-.015-3.082-1.184-3.113-4.76ZM13.713 3.64c.807-.978 1.351-2.34 1.202-3.64-1.164.047-2.572.775-3.406 1.752-.748.868-1.402 2.255-1.226 3.583 1.299.101 2.623-.661 3.43-1.695Z" />
                    </svg>
                  </ActionButton>
                ) : null}
              </Flex>
              {audioUrlValid === false && (
                <View marginStart={25}>
                  <Text UNSAFE_style={{ color: "var(--spectrum-global-color-red-600)", fontSize: 12 }}>
                    Please enter a valid URL
                  </Text>
                </View>
              )}
              {creatingProject?.appleMusicTrackName ? (
                <View marginStart={25}>
                  <Text UNSAFE_style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                    Apple Music track: {creatingProject.appleMusicTrackName}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <div></div>
          )}
        </RadioGroup>

        <TextField
          label="Name"
          placeholder="Project name"
          value={creatingProject ? creatingProject.name : ""}
          onChange={(value: string) => {
            if (creatingProject) {
              setCreatingProject({
                ...creatingProject,
                name: value,
              });
            } else {
              const now = new Date();
              setCreatingProject({
                name: value,
                artistName: "",
                songName: "",
                createdDate: now,
                updatedDate: now,
                audioFileName: "",
                audioFileUrl: "",
                isLocalUrl: true,
                editingMode: EditingMode.free,
                resolution: VideoAspectRatio["16/9"],
              });
            }
          }}
        />
        <TextField
          label="Artist"
          placeholder="Artist name"
          isRequired={false}
          value={creatingProject?.artistName ?? ""}
          onChange={(value: string) => {
            if (creatingProject) {
              setCreatingProject({
                ...creatingProject,
                artistName: value,
              });
            }
          }}
        />
        <TextField
          label="Song name"
          placeholder="Song title"
          isRequired={false}
          value={creatingProject?.songName ?? ""}
          onChange={(value: string) => {
            if (creatingProject) {
              setCreatingProject({
                ...creatingProject,
                songName: value,
              });
            }
          }}
        />
        <EditingModePicker
          selectedMode={creatingProject?.editingMode}
          onModeChange={(mode) => {
            if (creatingProject) {
              setCreatingProject({ ...creatingProject, editingMode: mode });
            }
          }}
        />
        <ResolutionPicker
          selectedResolution={creatingProject?.resolution}
          onResolutionChange={(resolution) => {
            if (creatingProject) {
              setCreatingProject({ ...creatingProject, resolution });
            }
          }}
        />
        <Flex gap={5}>
          <TextField
            width={"100%"}
            label="Album art url"
            placeholder="url"
            value={creatingProject ? creatingProject.albumArtSrc : ""}
            isRequired={false}
            onChange={(value: string) => {
              if (creatingProject) {
                setCreatingProject({
                  ...creatingProject,
                  albumArtSrc: value,
                });
              }
            }}
          />
          {creatingProject?.albumArtSrc ? (
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
                  marginTop: 24,
                }}
                src={creatingProject.albumArtSrc}
              />
            </View>
          ) : null}
        </Flex>
      </Form>
    </section>
  );
}
