import {
  DialogTrigger,
  ActionButton,
  Dialog,
  Heading,
  Divider,
  Content,
  Item,
  ListView,
  Text,
  Tooltip,
  TooltipTrigger,
  Flex,
} from "@adobe/react-spectrum";
import AnnotatePen from "@spectrum-icons/workflow/AnnotatePen";
import { initialPrompt, useAIImageGeneratorStore } from "./store";

export default function PromptLogButton() {
  const promptLog = useAIImageGeneratorStore((state) => state.promptLog);
  const setPrompt = useAIImageGeneratorStore((state) => state.setPrompt);

  return (
    <TooltipTrigger delay={1000}>
      <DialogTrigger isDismissable>
        <ActionButton>
          <AnnotatePen /> <Text>{promptLog.length}</Text>
        </ActionButton>

        {(close) => (
          <Dialog>
            <Heading>Prompt Log</Heading>
            <Divider />
            <Content>
              <ListView
                selectionStyle="highlight"
                aria-label="Static ListView items example"
                onAction={(key) => {
                  const prompt = promptLog[Number(key)];
                  setPrompt({ ...initialPrompt, prompt: prompt.prompt });
                  close();
                }}
              >
                {promptLog.map((prompt, index) => (
                  <Item key={index}>
                    <Flex gap={"size-100"}>
                      <Text>{prompt.prompt}</Text>
                      <Text>|</Text>
                      <Text>seed: {prompt.seed}</Text>
                    </Flex>
                  </Item>
                ))}
              </ListView>
            </Content>
          </Dialog>
        )}
      </DialogTrigger>
      <Tooltip>Prompt log</Tooltip>
    </TooltipTrigger>
  );
}
