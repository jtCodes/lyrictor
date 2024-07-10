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
import { useState } from "react";

export default function ImportImageButton() {
  const [isOpen, setOpen] = useState(false);

  return (
    <View>
      <ActionButton onPress={() => setOpen(true)}>Import</ActionButton>
      <DialogContainer type="fullscreen" onDismiss={() => setOpen(false)}>
        {isOpen && <ImportDialog />}
      </DialogContainer>
    </View>
  );
}

function ImportDialog() {
  const dialog = useDialogContainer();

  return (
    <Dialog>
      <Heading>Import</Heading>
      <Divider />
      <Content>
        <Form width="100%">
          <ImportImageItem />
        </Form>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={dialog.dismiss}>
          Cancel
        </Button>
        <Button variant="accent" onPress={dialog.dismiss}>
          Save
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}

function ImportImageItem() {
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
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setIsValidUrl(img.naturalHeight > 1);
      };
      img.onerror = () => {
        setIsValidUrl(false);
      };
      img.src = url;
    }
  };

  return (
    <>
      {!isValidUrl && (
        <>
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
            <Button variant="negative" style="fill">
              Remove
            </Button>
          </View>
        </Flex>
      )}
    </>
  );
}
