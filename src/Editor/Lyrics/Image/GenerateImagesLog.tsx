import { View, Flex, Image, Text } from "@adobe/react-spectrum";
import DeleteImageButton from "./DeleteImageButton";
import { useAIImageGeneratorStore } from "./store";

export default function GenerateImagesLog({ height }: { height: string }) {
  const generatedImageLog = useAIImageGeneratorStore(
    (state) => state.generatedImageLog
  );
  const selectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.selectedImageLogItem
  );
  const setSelectedImageLogItem = useAIImageGeneratorStore(
    (state) => state.setSelectedImageLogTiem
  );

  return (
    <View>
      <View paddingTop={"size50"} paddingBottom={"size-50"}>
        <Flex justifyContent={"space-between"}>
          <Text>
            <span style={{ fontWeight: "600" }}>Image Log</span>
          </Text>
          <DeleteImageButton />
        </Flex>
      </View>
      <View overflow={"auto"} height={height} marginTop={"size-50"}>
        <Flex marginTop={"size-100"} wrap={"wrap"} gap={"size-150"}>
          {generatedImageLog.map((image) => (
            <div
              key={image.url}
              onClick={() => {
                setSelectedImageLogItem(image);
              }}
            >
              <View
                borderColor={
                  selectedImageLogItem?.url === image.url
                    ? "yellow-400"
                    : undefined
                }
                borderWidth={"thick"}
                borderRadius={"small"}
                overflow={"hidden"}
              >
                <Image
                  key={image.url}
                  width={"130px"}
                  src={image.url}
                  alt="Sky and roof"
                />
              </View>
            </div>
          ))}
        </Flex>
      </View>
    </View>
  );
}
