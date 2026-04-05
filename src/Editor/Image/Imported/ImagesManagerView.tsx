import { View, Flex, Image, Button, Text } from "@adobe/react-spectrum";
import ImportImageButton, { ImageItem } from "./ImportImageButton";
import { useProjectStore } from "../../../Project/store";
import { useEffect, useState } from "react";
import { useAudioPosition } from "react-use-audio-player";
import GenerateAIImageButton from "../AI/GenerateAIImageButton";
import { useAIImageGeneratorStore } from "../AI/store";
import { GeneratedImage } from "../AI/types";
import { useAuthStore } from "../../../Auth/store";
import { useProjectService } from "../../../Project/useProjectService";
import { uploadBase64Image } from "../../../Project/firestoreProjectService";
import ImageAutoMode from "@spectrum-icons/workflow/ImageAutoMode";

type SelectedLibraryImage =
  | { source: "imported"; image: ImageItem }
  | { source: "generated"; image: GeneratedImage };

function isBase64DataUrl(url: string): boolean {
  return url.startsWith("data:");
}

function SectionLabel({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <Flex alignItems="center" justifyContent="space-between" width="100%">
      <Text
        UNSAFE_style={{
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.46)",
        }}
      >
        {title}
      </Text>
      <Text
        UNSAFE_style={{
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.34)",
        }}
      >
        {count}
      </Text>
    </Flex>
  );
}

function SourceBadge({ source }: { source: "imported" | "generated" }) {
  const isGenerated = source === "generated";

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: isGenerated ? 32 : undefined,
        minHeight: 28,
        padding: isGenerated ? "0 7px" : "3px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "rgba(255, 255, 255, 0.92)",
        background:
          source === "generated"
            ? "rgba(68, 138, 255, 0.72)"
            : "rgba(255, 255, 255, 0.16)",
        backdropFilter: "blur(10px)",
      }}
    >
      {isGenerated ? <ImageAutoMode size="S" /> : source}
    </div>
  );
}

function LibraryImageCard({
  imageUrl,
  source,
  isSelected,
  onPress,
}: {
  imageUrl: string;
  source: "imported" | "generated";
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <div
      onClick={onPress}
      style={{
        position: "relative",
        cursor: "pointer",
      }}
    >
      <SourceBadge source={source} />
      <View
        UNSAFE_style={{
          boxSizing: "border-box",
          background: "rgba(255, 255, 255, 0.03)",
        }}
        borderColor={isSelected ? "yellow-400" : "transparent"}
        borderWidth={"thick"}
        borderRadius={"small"}
        overflow={"hidden"}
      >
        <Image width={"130px"} src={imageUrl} alt={`${source} image`} />
      </View>
    </div>
  );
}

export default function ImagesManagerView() {
  const { position } = useAudioPosition({
    highRefreshRate: false,
  });
  const [saveProject] = useProjectService();
  const addNewLyricText = useProjectStore((state) => state.addNewLyricText);
  const images = useProjectStore((state) => state.images);
  const deleteImage = useProjectStore((state) => state.removeImagesById);
  const generatedImages = useAIImageGeneratorStore((state) =>
    state.generatedImageLog.filter((image) => image.url)
  );
  const hideGeneratedImage = useAIImageGeneratorStore((state) => state.hideImage);
  const updateGeneratedImage = useAIImageGeneratorStore(
    (state) => state.updateGeneratedImage
  );
  const selectedGeneratedImage = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );
  const setSelectedGeneratedImage = useAIImageGeneratorStore(
    (state) => state.setSelectedImageLogTiem
  );
  const editingProject = useProjectStore((state) => state.editingProject);
  const user = useAuthStore((state) => state.user);
  const [selectedImportedImage, setSelectedImportedImage] = useState<
    ImageItem | undefined
  >();
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGeneratedImage) {
      setSelectedImportedImage(undefined);
    }
  }, [selectedGeneratedImage]);

  const selectedImage: SelectedLibraryImage | undefined = selectedImportedImage
    ? { source: "imported", image: selectedImportedImage }
    : selectedGeneratedImage
      ? { source: "generated", image: selectedGeneratedImage }
      : undefined;

  function handleAddSelectedImageToTimeline() {
    if (selectedImage?.image.url) {
      addNewLyricText(
        "",
        position,
        true,
        selectedImage.image.url,
        false,
        undefined
      );
    }
  }

  async function handleDeleteSelectedImage() {
    if (!selectedImage) {
      return;
    }

    if (selectedImage.source === "generated") {
      hideGeneratedImage(selectedImage.image.url);
      await saveProject();
    } else if (selectedImage.image.id !== undefined) {
      deleteImage([selectedImage.image.id]);
    }

    setSelectedImportedImage(undefined);
  }

  async function handleSaveGeneratedImageToCloud() {
    if (
      !selectedImage ||
      selectedImage.source !== "generated" ||
      !user ||
      !editingProject ||
      !isBase64DataUrl(selectedImage.image.url)
    ) {
      return;
    }

    setUploadingUrl(selectedImage.image.url);
    try {
      const downloadUrl = await uploadBase64Image(
        user.uid,
        editingProject.name,
        selectedImage.image.url,
        Date.now()
      );
      updateGeneratedImage(selectedImage.image.url, {
        ...selectedImage.image,
        url: downloadUrl,
      });
      await saveProject();
    } catch (e) {
      console.error("Failed to upload generated image:", e);
    } finally {
      setUploadingUrl(null);
    }
  }

  const isGeneratedSelection = selectedImage?.source === "generated";
  const canSaveGeneratedSelection = Boolean(
    isGeneratedSelection &&
      user &&
      editingProject &&
      selectedImage?.image.url &&
      isBase64DataUrl(selectedImage.image.url)
  );

  return (
    <View
      height="100%"
      overflow={"hidden"}
      UNSAFE_style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <View
        paddingX="size-200"
        paddingTop="size-150"
        paddingBottom="size-150"
        UNSAFE_style={{ flexShrink: 0 }}
      >
        <Flex direction="column" gap="size-150">
          <Text
            UNSAFE_style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.46)",
            }}
          >
            Add To Image Library
          </Text>
          <Flex gap="size-100" width="100%">
            <View flex width="50%">
              <ImportImageButton isFullWidth />
            </View>
            <View flex width="50%">
              <GenerateAIImageButton
                mode="library"
                label="Generate"
                isFullWidth
              />
            </View>
          </Flex>
        </Flex>
      </View>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          padding: "6px 16px 16px",
        }}
      >
        <Flex direction="column" gap="size-300">
          <Flex direction="column" gap="size-125">
            <SectionLabel title="Imported" count={images.length} />
            {images.length ? (
              <Flex wrap gap="size-150" alignItems="center" justifyContent="center">
                {images.map((image, index) => (
                  <LibraryImageCard
                    key={image.id + index}
                    imageUrl={image.url!}
                    source="imported"
                    isSelected={
                      selectedImportedImage?.id === image.id
                    }
                    onPress={() => {
                      setSelectedImportedImage(image);
                    }}
                  />
                ))}
              </Flex>
            ) : (
              <Text
                UNSAFE_style={{
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.38)",
                }}
              >
                Imported images will appear here.
              </Text>
            )}
          </Flex>

          <Flex direction="column" gap="size-125">
            <SectionLabel title="Generated" count={generatedImages.length} />
            {generatedImages.length ? (
              <Flex wrap gap="size-150" alignItems="center" justifyContent="center">
                {generatedImages.map((image) => (
                  <LibraryImageCard
                    key={image.url}
                    imageUrl={image.url}
                    source="generated"
                    isSelected={
                      selectedGeneratedImage?.url === image.url
                    }
                    onPress={() => {
                      setSelectedGeneratedImage(image);
                    }}
                  />
                ))}
              </Flex>
            ) : (
              <Text
                UNSAFE_style={{
                  fontSize: 12,
                  color: "rgba(255, 255, 255, 0.38)",
                }}
              >
                Generated images will appear here after you create them.
              </Text>
            )}
          </Flex>
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
            alignItems={"center"}
            width={"100%"}
            gap={10}
            wrap
          >
            <View flex>
              <Flex direction="column" gap="size-25">
                <Text>
                  <span style={{ fontWeight: 600 }}>
                    {selectedImage.source === "generated"
                      ? "Generated image"
                      : "Imported image"}
                  </span>
                </Text>
                <Text
                  UNSAFE_style={{
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.42)",
                  }}
                >
                  {selectedImage.source === "generated"
                    ? canSaveGeneratedSelection
                      ? "Local-only generation selected"
                      : "Generated image selected"
                    : "Imported library image selected"}
                </Text>
              </Flex>
            </View>
            <Button
              variant="negative"
              onPress={handleDeleteSelectedImage}
              UNSAFE_style={{ minWidth: 92 }}
            >
              {selectedImage.source === "generated" ? "Remove" : "Delete"}
            </Button>
            {canSaveGeneratedSelection ? (
              <Button
                variant="secondary"
                onPress={handleSaveGeneratedImageToCloud}
                isDisabled={uploadingUrl === selectedImage.image.url}
                UNSAFE_style={{ minWidth: 132 }}
              >
                {uploadingUrl === selectedImage.image.url
                  ? "Saving..."
                  : "Save To Cloud"}
              </Button>
            ) : null}
            <Button
              variant="accent"
              onPress={handleAddSelectedImageToTimeline}
              UNSAFE_style={{ minWidth: 132 }}
            >
              Add To Timeline
            </Button>
          </Flex>
        </View>
      ) : null}
    </View>
  );
}
