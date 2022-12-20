import {
  Form,
  Radio,
  RadioGroup,
  TextField,
  View,
} from "@adobe/react-spectrum";
import { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ProjectDetail } from "./types";
import { useProjectStore } from "./store";

export enum DataSource {
  local = "local",
  stream = "stream",
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
        isLocalUrl: true,
      });
    }
  }, [acceptedFiles]);

  useEffect(() => {
    setCreatingProject({
      name: creatingProject?.name ? creatingProject.name : "",
      createdDate: new Date(),
      audioFileName: "",
      audioFileUrl: "",
      isLocalUrl: selectedDataSource === DataSource.local,
    });
  }, [selectedDataSource]);

  const files = acceptedFiles.map((file: any) => {
    localStorage.setItem("test", JSON.stringify(file.path));
    console.log(file, URL.createObjectURL(file));
    return <View key={file.path}>{file.path}</View>;
  });

  return (
    <section className="container">
      {" "}
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
              placeholder="Audio stream url"
              // value={creatingProject ? creatingProject.name : ""}
              onChange={(value: string) => {
                setCreatingProject({
                  name: creatingProject?.name ? creatingProject?.name : "",
                  createdDate: new Date(),
                  audioFileName: value,
                  audioFileUrl: value, 
                  isLocalUrl: false,
                });
              }}
            />
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
              setCreatingProject({
                name: value,
                createdDate: new Date(),
                audioFileName: "",
                audioFileUrl: "",
                isLocalUrl: true,
              });
            }
          }}
        />
      </Form>
    </section>
  );
}
