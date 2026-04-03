import { View, Flex, Image, Button } from "@adobe/react-spectrum";
import ImportImageButton, { ImageItem } from "./ImportImageButton";
import { useProjectStore } from "../../../Project/store";
import { useState } from "react";
import { useAudioPosition } from "react-use-audio-player";

export default function ImagesManagerView() {
  const { position } = useAudioPosition({
    highRefreshRate: false,
  });
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const images = useProjectStore((state) => state.images);
  const deleteImage = useProjectStore((state) => state.removeImagesById);
  const [selectedImage, setSelectedImage] = useState<ImageItem | undefined>();

  function handleAddSelectedImageToTimeline() {
    if (selectedImage) {
      addNewLyricText("", position, true, selectedImage.url, false, undefined);
    }
  }

  function handleDeleteSelectedImage() {
    if (selectedImage) {
      deleteImage(selectedImage.id);
    }
    setSelectedImage(undefined);
  }

  return (
    <View
      height="100%"
      overflow={"hidden"}
      UNSAFE_style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <View paddingX="size-200" paddingTop="size-150" paddingBottom="size-75" UNSAFE_style={{ flexShrink: 0 }}>
        <ImportImageButton />
      </View>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          padding: "4px 16px 8px",
        }}
      >
        <Flex
          wrap={"wrap"}
          gap={"size-150"}
          alignItems={"center"}
          justifyContent={"center"}
        >
          {images.map((image, index) => (
            <div
              key={image.id + index}
              onClick={() => {
                setSelectedImage(image);
              }}
            >
              <View
                UNSAFE_style={{ boxSizing: "border-box" }}
                borderColor={
                  selectedImage?.id === image.id ? "yellow-400" : "transparent"
                }
                borderWidth={"thick"}
                borderRadius={"small"}
                overflow={"hidden"}
              >
                <Image width={"130px"} src={image.url!} />
              </View>
            </div>
          ))}
        </Flex>
      </div>
      {selectedImage ? (
        <View
          paddingX="size-200"
          paddingTop={6}
          paddingBottom={6}
          UNSAFE_style={{
            flexShrink: 0,
            background:
              "linear-gradient(180deg, rgba(18, 20, 22, 0.72), rgba(18, 20, 22, 0.92))",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          }}
        >
          <Flex
            justifyContent={"space-between"}
            alignItems={"center"}
            width={"100%"}
            gap={8}
          >
            <Button
              variant="negative"
              onPress={handleDeleteSelectedImage}
              UNSAFE_style={{ minWidth: 92 }}
            >
              Delete
            </Button>
            <Button
              variant="accent"
              onPress={handleAddSelectedImageToTimeline}
              UNSAFE_style={{ minWidth: 92 }}
            >
              Add
            </Button>
          </Flex>
        </View>
      ) : null}
    </View>
  );
}
