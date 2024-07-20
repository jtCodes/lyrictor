import {
  View,
  ActionButton,
  DialogContainer,
  useDialogContainer,
  Dialog,
  Heading,
  Divider,
  Content,
  Form,
  TextField,
  ButtonGroup,
  Button,
  Flex,
  Text,
  LabeledValue,
} from "@adobe/react-spectrum";
import { useState, useMemo } from "react";
import { useProjectStore } from "../../../Project/store";

export default function ImportImageButton() {
  const [isOpen, setOpen] = useState(false);

  return (
    <View>
      <ActionButton onPress={() => setOpen(true)}>Import New Images</ActionButton>
      <DialogContainer type="fullscreen" onDismiss={() => setOpen(false)}>
        {isOpen && <ImportDialog />}
      </DialogContainer>
    </View>
  );
}

export interface ImageItem {
  id?: any;
  url?: string;
  imageWidth?: number;
  imageHeight?: number;
}

function ImportDialog() {
  const dialog = useDialogContainer();
  const [imageItems, setImageItems] = useState<ImageItem[]>([
    { id: Date.now() },
  ]);
  const imageItemsLength = useMemo(() => imageItems.length - 1, [imageItems]);
  const addImageItemsToStore = useProjectStore((state) => state.addImages);

  function handleValidImageLoaded(
    url: string,
    imageWidth: number,
    imageHeight: number
  ) {
    let newImageItems = [...imageItems];
    newImageItems.push({
      id: Date.now() + url,
      url,
      imageHeight,
      imageWidth,
    });
    setImageItems(newImageItems);
  }

  function handleOnDeleteItem(id: any) {
    let newImageItems = imageItems.filter((item) => item.id !== id);
    setImageItems(newImageItems);
  }

  function handleSaveImportsButtonClick() {
    let images = [...imageItems];
    images.shift();
    addImageItemsToStore(images);
    dialog.dismiss()
  }

  return (
    <Dialog>
      <Heading>Import New Images</Heading>
      <Divider />
      <Content>
        <Form width="100%">
          {imageItems.map((item) => (
            <ImportImageItem
              key={item.id}
              id={item.id}
              onValidImageLoaded={(
                url: string,
                imageWidth: number,
                imageHeight: number
              ) => {
                handleValidImageLoaded(url, imageWidth, imageHeight);
              }}
              onDelete={handleOnDeleteItem}
            />
          ))}
        </Form>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={dialog.dismiss}>
          Cancel
        </Button>
        <Button variant="accent" onPress={handleSaveImportsButtonClick}>
          Save ({imageItemsLength})
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}

function ImportImageItem({
  id,
  onValidImageLoaded,
  onDelete,
}: {
  id: any;
  onValidImageLoaded: (
    url: string,
    imageWidth: number,
    imageHeight: number
  ) => void;
  onDelete?: (id: any) => void;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isValidUrl, setIsValidUrl] = useState(true);

  const handleChange = (value: string) => {
    const url = value;
    setImageUrl(url);
    setImageSize({ width: 0, height: 0 });
    setIsValidUrl(true);

    if (url) {
      const img = new Image();
      img.onload = () => {
        const isValid = img.naturalHeight > 1;
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setIsValidUrl(isValid);

        if (isValid) {
          onValidImageLoaded(url, img.naturalWidth, img.naturalHeight);
        }
      };
      img.onerror = () => {
        setIsValidUrl(false);
      };
      img.src = url;
    }
  };

  return (
    <>
      {(!isValidUrl || !imageUrl) && (
        <>
          <Divider marginTop={25} height={1} />
          <TextField
            autoFocus
            label="Paste image url"
            value={imageUrl}
            onChange={handleChange}
            errorMessage={!isValidUrl ? "Invalid url" : undefined}
          />
          <Text
            UNSAFE_style={{
              color: "red",
              fontSize: "11px",
              paddingLeft: 2.5,
              marginTop: 1,
            }}
          >
            {!isValidUrl ? "Invalid Url" : null}
          </Text>
        </>
      )}
      {imageUrl && isValidUrl && (
        <Flex gap={20}>
          <View>
            <img
              src={imageUrl}
              alt="Imported image"
              style={{ marginTop: "10px", height: "120px", width: "auto" }}
            />
          </View>
          <View>
            <Flex direction={"column"} gap={5}>
              <TextField
                label="Url"
                isRequired={false}
                value={imageUrl}
                isReadOnly
                minWidth={300}
              />
              <TextField
                label="Description"
                isRequired={false}
                minWidth={300}
              />
            </Flex>
          </View>
          <View>
            <LabeledValue
              label="Dimensions"
              value={`${imageSize.width}x${imageSize.height}`}
            />
          </View>
          <View marginStart={"auto"} marginTop={5}>
            <Button
              variant="negative"
              style="fill"
              onPressEnd={() => {
                if (onDelete) {
                  onDelete(id);
                }
              }}
            >
              Remove
            </Button>
          </View>
        </Flex>
      )}
    </>
  );
}
