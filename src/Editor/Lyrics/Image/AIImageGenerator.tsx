import {
  Button,
  ProgressCircle,
  View,
  Text,
  Flex,
} from "@adobe/react-spectrum";
import { useState } from "react";
import { useAIImageGeneratorStore } from "./store";
import { useAIImageService } from "./useAIImageService";

export default function AIImageGenerator() {
  const [generateImage, isLoading] = useAIImageService(true);
  const setCurrentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.setCurrentGenFileUrl
  );
  const currentGenFileUrl = useAIImageGeneratorStore(
    (state) => state.currentGenFileUrl
  );

  async function onGeneratePress() {
    const resp = await generateImage();
    const name = resp.data[0][0].name;
    setCurrentGenFileUrl(name);
  }

  return (
    <View>
      <Flex direction="column" width="size-2100" gap="size-100">
        <Button
          variant="accent"
          onPress={onGeneratePress}
          isDisabled={isLoading}
        >
          {isLoading ? (
            <ProgressCircle
              aria-label="Loading…"
              isIndeterminate
              size="S"
              marginEnd={5}
            />
          ) : null}
          <Text>Generate</Text>
        </Button>
        <Text>{currentGenFileUrl}</Text>
        {currentGenFileUrl ? (
          <View alignSelf={"center"} width={312} height={312}>
            <img
              className="w-full object-contain h-[calc(100%-50px)"
              width={"100%"}
              height={"100%"}
              style={{ objectFit: "cover" }}
              src={currentGenFileUrl}
              alt=""
              data-modded="true"
            />
          </View>
        ) : null}
      </Flex>
    </View>
  );
}
