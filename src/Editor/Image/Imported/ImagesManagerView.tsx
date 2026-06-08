import {
  View,
  Flex,
  Image,
  Button,
  Text,
  Dialog,
  DialogContainer,
  Heading,
  Divider,
  Content,
  TextField,
  ButtonGroup,
} from "@adobe/react-spectrum";
import ImportImageButton, { ImageItem } from "./ImportImageButton";
import { useProjectStore } from "../../../Project/store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPosition } from "react-use-audio-player";
import GenerateAIImageButton from "../AI/GenerateAIImageButton";
import { useAIImageGeneratorStore } from "../AI/store";
import { GeneratedImage } from "../AI/types";
import { useAuthStore } from "../../../Auth/store";
import { useProjectService } from "../../../Project/useProjectService";
import { uploadBase64Image } from "../../../Project/firestoreProjectService";
import ImageAutoMode from "@spectrum-icons/workflow/ImageAutoMode";
import Cloud from "@spectrum-icons/workflow/Cloud";
import CloudOutline from "@spectrum-icons/workflow/CloudOutline";

type SelectedLibraryImage =
  | { source: "imported"; image: ImageItem }
  | { source: "generated"; image: GeneratedImage };

function isBase64DataUrl(url: string): boolean {
  return url.startsWith("data:");
}

function SectionLabel({
  title,
  count,
  detail,
}: {
  title: string;
  count: number;
  detail?: string;
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
      <Flex alignItems="center" gap="size-100">
        {detail ? (
          <Text
            UNSAFE_style={{
              fontSize: 11,
              color: "rgba(255, 183, 77, 0.9)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {detail}
          </Text>
        ) : null}
        <Text
          UNSAFE_style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.34)",
          }}
        >
          {count}
        </Text>
      </Flex>
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

function BrokenImageWarningIcon() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(196, 80, 29, 0.92)",
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.28)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.75L21 19.5H3L12 3.75Z" fill="rgba(255, 244, 230, 0.98)" />
          <path
            d="M12 8.2V13.2"
            stroke="rgba(196, 80, 29, 0.96)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.9" r="1.15" fill="rgba(196, 80, 29, 0.96)" />
        </svg>
      </div>
    </div>
  );
}

function LibraryImageCard({
  imageUrl,
  source,
  isSelected,
  showCloudState,
  onStatusChange,
  onPress,
}: {
  imageUrl: string;
  source: "imported" | "generated";
  isSelected: boolean;
  showCloudState?: boolean;
  onStatusChange?: (imageUrl: string, status: "loaded" | "broken") => void;
  onPress: () => void;
}) {
  const [importedImageStatus, setImportedImageStatus] = useState<
    "loading" | "loaded" | "failed"
  >(source === "imported" ? "loading" : "loaded");
  const previousImportedImageUrlRef = useRef<string | null>(
    source === "imported" ? imageUrl : null
  );
  const reportedStatusKeyRef = useRef<string | null>(null);

  if (source === "imported") {
    if (previousImportedImageUrlRef.current !== imageUrl) {
      previousImportedImageUrlRef.current = imageUrl;
      reportedStatusKeyRef.current = null;

      if (importedImageStatus !== "loading") {
        setImportedImageStatus("loading");
      }
    }
  } else if (previousImportedImageUrlRef.current !== null) {
    previousImportedImageUrlRef.current = null;
    reportedStatusKeyRef.current = null;

    if (importedImageStatus !== "loaded") {
      setImportedImageStatus("loaded");
    }
  }

  const isBroken = source === "imported" && importedImageStatus === "failed";

  function reportImportedStatus(status: "loaded" | "broken") {
    const nextStatusKey = `${imageUrl}:${status}`;

    if (reportedStatusKeyRef.current === nextStatusKey) {
      return;
    }

    reportedStatusKeyRef.current = nextStatusKey;
    onStatusChange?.(imageUrl, status);
  }

  return (
    <div
      onClick={onPress}
      style={{
        position: "relative",
        cursor: "pointer",
      }}
    >
      {source === "generated" ? <SourceBadge source={source} /> : null}
      {source === "generated" ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "rgba(0, 0, 0, 0.42)",
            backdropFilter: "blur(10px)",
          }}
        >
          {showCloudState ? (
            <Cloud
              size="S"
              UNSAFE_style={{ color: "var(--spectrum-global-color-green-500)" }}
            />
          ) : (
            <CloudOutline
              size="S"
              UNSAFE_style={{ color: "rgba(255, 255, 255, 0.88)" }}
            />
          )}
        </div>
      ) : null}
      <View
        UNSAFE_style={{
          boxSizing: "border-box",
          background: isBroken ? "rgba(196, 80, 29, 0.12)" : "rgba(255, 255, 255, 0.03)",
        }}
        borderColor={isSelected ? "yellow-400" : "transparent"}
        borderWidth={"thick"}
        borderRadius={"small"}
        overflow={"hidden"}
      >
        <div
          style={{
            width: 130,
            minHeight: 90,
            background: isBroken ? "rgba(255, 120, 60, 0.12)" : "rgba(255, 255, 255, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {source === "imported" && isBroken ? (
            <>
              <BrokenImageWarningIcon />
              <Text
                UNSAFE_style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  color: "rgba(255, 222, 204, 0.98)",
                  textAlign: "center",
                  lineHeight: 1.35,
                  padding: "62px 12px 20px",
                }}
              >
                Broken image URL
              </Text>
            </>
          ) : null}
          {source === "imported" ? (
            <img
              src={imageUrl}
              alt={`${source} image`}
              onLoad={() => {
                setImportedImageStatus((currentStatus) =>
                  currentStatus === "loaded" ? currentStatus : "loaded"
                );
                reportImportedStatus("loaded");
              }}
              onError={() => {
                setImportedImageStatus((currentStatus) =>
                  currentStatus === "failed" ? currentStatus : "failed"
                );
                reportImportedStatus("broken");
              }}
              style={{
                display: isBroken ? "none" : "block",
                width: 130,
                height: "auto",
              }}
            />
          ) : (
            <Image width={"130px"} src={imageUrl} alt={`${source} image`} />
          )}
        </div>
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
  const setImages = useProjectStore((state) => state.setImages);
  const lyricTexts = useProjectStore((state) => state.lyricTexts);
  const updateLyricTexts = useProjectStore((state) => state.updateLyricTexts);
  const deleteImage = useProjectStore((state) => state.removeImagesById);
  const generatedImages = useAIImageGeneratorStore((state) =>
    state.generatedImageLog.filter((image) => image.url)
  );
  const unsavedGeneratedCount = generatedImages.filter((image) =>
    isBase64DataUrl(image.url)
  ).length;
  const generatedImageUrls = useMemo(
    () => new Set(generatedImages.map((image) => image.url)),
    [generatedImages]
  );
  const importedImages = useMemo(
    () => images.filter((image) => image.url && !generatedImageUrls.has(image.url)),
    [generatedImageUrls, images]
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
  const [editingImportedImage, setEditingImportedImage] = useState<ImageItem | undefined>();
  const [editingImportedUrl, setEditingImportedUrl] = useState("");
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);
  const [brokenImportedUrls, setBrokenImportedUrls] = useState<string[]>([]);

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

  function handleStartEditImportedImage() {
    if (!selectedImportedImage) {
      return;
    }

    setEditingImportedImage(selectedImportedImage);
    setEditingImportedUrl(selectedImportedImage.url ?? "");
  }

  function handleCloseEditImportedImage() {
    setEditingImportedImage(undefined);
    setEditingImportedUrl("");
  }

  function handleSaveEditedImportedImage() {
    if (!editingImportedImage?.id) {
      return;
    }

    const previousUrl = editingImportedImage.url;
    const nextUrl = editingImportedUrl.trim();

    if (!nextUrl) {
      return;
    }

    const nextImages = images.map((image) =>
      image.id === editingImportedImage.id
        ? {
            ...image,
            url: nextUrl,
          }
        : image
    );
    const updatedImage = nextImages.find((image) => image.id === editingImportedImage.id);
    const nextLyricTexts = previousUrl
      ? lyricTexts.map((lyricText) =>
          lyricText.isImage && lyricText.imageUrl === previousUrl
            ? {
                ...lyricText,
                imageUrl: nextUrl,
              }
            : lyricText
        )
      : lyricTexts;

    setImages(nextImages);
    updateLyricTexts(nextLyricTexts, false);
    setBrokenImportedUrls((currentUrls) =>
      currentUrls.filter((url) => url !== previousUrl && url !== nextUrl)
    );
    setSelectedImportedImage(updatedImage);
    handleCloseEditImportedImage();
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
  const selectedImageTitle = selectedImage
    ? selectedImage.source === "generated"
      ? "Generated image"
      : "Imported image"
    : "";
  const selectedImageDescription = selectedImage
    ? selectedImage.source === "generated"
      ? canSaveGeneratedSelection
        ? "Local only"
        : "Saved to cloud"
      : ""
    : "";
  const editingImportedImageAffectedTimelineCount = useMemo(() => {
    if (!editingImportedImage?.url) {
      return 0;
    }

    return lyricTexts.filter(
      (lyricText) => lyricText.isImage && lyricText.imageUrl === editingImportedImage.url
    ).length;
  }, [editingImportedImage?.url, lyricTexts]);
  const currentImportedUrls = useMemo(
    () => new Set(importedImages.map((image) => image.url).filter(Boolean) as string[]),
    [importedImages]
  );
  const visibleBrokenImportedUrls = useMemo(
    () => brokenImportedUrls.filter((url) => currentImportedUrls.has(url)),
    [brokenImportedUrls, currentImportedUrls]
  );

  const handleImportedImageStatusChange = useCallback(
    (imageUrl: string, status: "loaded" | "broken") => {
      setBrokenImportedUrls((currentUrls) => {
        const hasUrl = currentUrls.includes(imageUrl);

        if (status === "broken") {
          return hasUrl ? currentUrls : [...currentUrls, imageUrl];
        }

        return hasUrl ? currentUrls.filter((url) => url !== imageUrl) : currentUrls;
      });
    },
    []
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
            <SectionLabel
              title="Imported"
              count={importedImages.length}
              detail={visibleBrokenImportedUrls.length ? `${visibleBrokenImportedUrls.length} broken` : undefined}
            />
            {importedImages.length ? (
              <Flex wrap gap="size-150" alignItems="center" justifyContent="center">
                {importedImages.map((image, index) => (
                  <LibraryImageCard
                    key={image.id ?? image.url ?? index}
                    imageUrl={image.url!}
                    source="imported"
                    isSelected={
                      selectedImportedImage?.id === image.id
                    }
                    onStatusChange={handleImportedImageStatusChange}
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
            <SectionLabel
              title="Generated"
              count={generatedImages.length}
              detail={
                unsavedGeneratedCount > 0
                  ? `${unsavedGeneratedCount} unsaved`
                  : undefined
              }
            />
            {generatedImages.length ? (
              <Flex wrap gap="size-150" alignItems="center" justifyContent="center">
                {generatedImages.map((image) => (
                  <LibraryImageCard
                    key={image.url}
                    imageUrl={image.url}
                    source="generated"
                    showCloudState={!isBase64DataUrl(image.url)}
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
          paddingTop="size-100"
          paddingBottom="size-100"
          UNSAFE_style={{
            flexShrink: 0,
            background:
              "linear-gradient(180deg, rgba(18, 20, 22, 0.72), rgba(18, 20, 22, 0.92))",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 12,
              width: "100%",
            }}
          >
            <div
              style={{
                minWidth: 0,
                display: "grid",
                gap: selectedImageDescription ? 2 : 0,
              }}
            >
              <Text
                UNSAFE_style={{
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "rgba(255, 255, 255, 0.92)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedImageTitle}
              </Text>
              {selectedImageDescription ? (
                <Text
                  UNSAFE_style={{
                    fontSize: 12,
                    lineHeight: 1.2,
                    color: "rgba(255, 255, 255, 0.42)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedImageDescription}
                </Text>
              ) : null}
            </div>
            <Flex
              alignItems="center"
              gap="size-75"
              UNSAFE_style={{ flexShrink: 0 }}
            >
              <Button
                variant="negative"
                onPress={handleDeleteSelectedImage}
                UNSAFE_style={{ minWidth: 74 }}
              >
                {selectedImage.source === "generated" ? "Remove" : "Delete"}
              </Button>
              {selectedImage.source === "imported" ? (
                <Button
                  variant="secondary"
                  onPress={handleStartEditImportedImage}
                  UNSAFE_style={{ minWidth: 64 }}
                >
                  Edit
                </Button>
              ) : null}
              {canSaveGeneratedSelection ? (
                <Button
                  variant="secondary"
                  onPress={handleSaveGeneratedImageToCloud}
                  isDisabled={uploadingUrl === selectedImage.image.url}
                  UNSAFE_style={{ minWidth: 82 }}
                >
                  {uploadingUrl === selectedImage.image.url ? "Saving" : "Cloud"}
                </Button>
              ) : null}
              <Button
                variant="accent"
                onPress={handleAddSelectedImageToTimeline}
                UNSAFE_style={{ minWidth: 64 }}
              >
                Add
              </Button>
            </Flex>
          </div>
        </View>
      ) : null}
      <DialogContainer onDismiss={handleCloseEditImportedImage}>
        {editingImportedImage ? (
          <Dialog>
            <Heading>Replace image URL</Heading>
            <Divider />
            <Content>
              <Text
                UNSAFE_style={{
                  display: "block",
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: 12,
                }}
              >
                This will update {editingImportedImageAffectedTimelineCount} timeline item{editingImportedImageAffectedTimelineCount === 1 ? "" : "s"} using this image.
              </Text>
              <TextField
                autoFocus
                label="Image URL"
                value={editingImportedUrl}
                onChange={setEditingImportedUrl}
                width="100%"
              />
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={handleCloseEditImportedImage}>
                Cancel
              </Button>
              <Button
                variant="accent"
                onPress={handleSaveEditedImportedImage}
                isDisabled={!editingImportedUrl.trim()}
              >
                Save
              </Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </View>
  );
}
