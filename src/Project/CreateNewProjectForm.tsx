import { Form, TextField, View } from "@adobe/react-spectrum";
import { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ProjectDetail } from "./types";
import { useProjectStore } from "./store";

export default function CreateNewProjectForm({
  creatingProject,
  setCreatingProject,
}: {
  creatingProject?: ProjectDetail;
  setCreatingProject: (project: ProjectDetail) => void;
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
      });
    }
  }, [acceptedFiles]);

  const files = acceptedFiles.map((file: any) => {
    localStorage.setItem("test", JSON.stringify(file.path));
    console.log(file, URL.createObjectURL(file));
    return <View key={file.path}>{file.path}</View>;
  });

  return (
    <section className="container">
      <div {...getRootProps({ className: "dropzone" })}>
        <input
          {...getInputProps()}
          type={"file"}
          accept="audio/mp3,audio/*;capture=microphone"
        />{" "}
        <View backgroundColor={"gray-200"} padding={5} borderRadius={"regular"}>
          <p>Drag 'n' drop an audio file, or click to select one</p>
          <h4>{files}</h4>
        </View>
      </div>
      <Form maxWidth="size-3600" isRequired necessityIndicator="label">
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
              });
            }
          }}
        />
      </Form>
    </section>
  );
}
