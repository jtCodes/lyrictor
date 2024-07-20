import { View, Flex, Image, Button } from "@adobe/react-spectrum";
import ImportImageButton, { ImageItem } from "./ImportImageButton";
import { useProjectStore } from "../../../Project/store";
import { useState } from "react";
import { useAudioPosition } from "react-use-audio-player";

export default function ImagesManagerView({
  containerHeight,
}: {
  containerHeight: number;
}) {
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
    <View height={containerHeight}>
      <ImportImageButton />
      <View
        overflow={"auto"}
        marginTop={"size-100"}
        paddingBottom={"size-600"}
        paddingTop={"size-10"}
        height={containerHeight - 40}
      >
        <Flex
          marginTop={"size-100"}
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
      </View>
      {selectedImage ? (
        <View
          UNSAFE_style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            paddingBottom: 10,
          }}
        >
          <Flex
            justifyContent={"space-between"}
            width={"100%"}
            UNSAFE_style={{ paddingLeft: 20, paddingRight: 20 }}
          >
            <Button
              variant="negative"
              onPress={handleDeleteSelectedImage}
              UNSAFE_style={{
                boxShadow: "0px 40px 112px 52px rgba(0,0,0,0.75)",
              }}
            >
              Delete
            </Button>
            <Button
              variant="accent"
              isDisabled={setSelectedImage === undefined}
              onPress={handleAddSelectedImageToTimeline}
              UNSAFE_style={{
                boxShadow: "0px 40px 112px 52px rgba(0,0,0,0.75)",
              }}
            >
              Add
            </Button>
          </Flex>
        </View>
      ) : null}
    </View>
  );
}
