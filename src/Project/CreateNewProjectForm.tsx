import {
  Content,
  ContextualHelp,
  Form,
  Heading,
  Link,
  Radio,
  RadioGroup,
  TextField,
  View,
} from "@adobe/react-spectrum";
import { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useYoutubeService } from "../Youtube/useYoutubeService";
import { ProjectDetail } from "./types";

export enum DataSource {
  local = "local",
  stream = "stream",
  youtube = "youtube",
}

export default function CreateNewProjectForm({
  creatingProject,
  setCreatingProject,
  selectedDataSource,
  setSelectedDataSource,
}: {
  creatingProject?: ProjectDetail;
  setCreatingProject: (project: ProjectDetail) => void;
  selectedDataSource: DataSource;
  setSelectedDataSource: (dataSource: DataSource) => void;
}) {
  const { acceptedFiles, getRootProps, getInputProps } = useDropzone();

  useEffect(() => {
    const file: any = acceptedFiles[0];
    if (file) {
      setCreatingProject({
        name: creatingProject?.name ? creatingProject?.name : file.path,
        createdDate: new Date(),
        audioFileName: file.path,
        audioFileUrl: URL.createObjectURL(file),
        dataSource: DataSource.local,
      });
    }
  }, [acceptedFiles]);

  useEffect(() => {
    setCreatingProject({
      name: creatingProject?.name ? creatingProject.name : "",
      createdDate: new Date(),
      audioFileName: "",
      audioFileUrl: "",
      dataSource: selectedDataSource,
    });

  }, [selectedDataSource]);

  const files = acceptedFiles.map((file: any) => {
    localStorage.setItem("test", JSON.stringify(file.path));
    console.log(file, URL.createObjectURL(file));
    return <View key={file.path}>{file.path}</View>;
  });

  return (
    <section className="container">
      <Form maxWidth="size-3600" isRequired necessityIndicator="label">
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
            <TextField
              marginStart={25}
              label="Url"
              contextualHelp={
                <ContextualHelp>
                  <Content>
                    Stream url = url that can download the audio file.
                    <br />
                    ie.{" "}
                    <Link>
                      https://github.com/prof3ssorSt3v3/media-sample-files/blob/master/hal-9000.mp3
                    </Link>
                  </Content>
                </ContextualHelp>
              }
              onChange={(value: string) => {
                setCreatingProject({
                  name: creatingProject?.name ? creatingProject?.name : "",
                  createdDate: new Date(),
                  audioFileName: value,
                  audioFileUrl: value,
                  dataSource: DataSource.stream,
                });
              }}
            />
          ) : (
            <div></div>
          )}
          <Radio value={DataSource.youtube}>Youtube ur l (experimental)</Radio>
          {selectedDataSource === DataSource.youtube ? (
            <TextField
              marginStart={25}
              label="Url"
              contextualHelp={
                <ContextualHelp>
                  <Content>
                    Any url with youtube domain.
                    <br />
                    Youtube
                    <br />
                    <Link>
                      https://www.youtube.com/watch?v=32g3ekAi9rw&list=OLAK5uy_lT-lhrMolxOXnDWqVuY61eWyltCm7guZ0&index=6
                    </Link>
                    <br />
                    Youtube music
                    <br />
                    <Link>
                      https://music.youtube.com/watch?v=RmYCOm4ehKs&list=RDAMVMRmYCOm4ehKs
                    </Link>
                  </Content>
                </ContextualHelp>
              }
              onChange={(value: string) => {
                setCreatingProject({
                  name: creatingProject?.name ? creatingProject?.name : "",
                  createdDate: new Date(),
                  audioFileName: value,
                  audioFileUrl: value,
                  dataSource: DataSource.youtube,
                });
              }}
            />
          ) : (
            <div></div>
          )}
        </RadioGroup>

        <TextField
          label="Project Name"
          value={creatingProject ? creatingProject.name : ""}
          onChange={(value: string) => {
            if (creatingProject) {
              setCreatingProject({
                ...creatingProject,
                name: value,
              });
            } else {
              setCreatingProject({
                name: value,
                createdDate: new Date(),
                audioFileName: "",
                audioFileUrl: "",
                dataSource: DataSource.local,
              });
            }
          }}
        />
      </Form>
    </section>
  );
}
