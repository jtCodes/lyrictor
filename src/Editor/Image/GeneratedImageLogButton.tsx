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
} from "@adobe/react-spectrum";
import Images from "@spectrum-icons/workflow/Images";
import { useAIImageGeneratorStore } from "./store";

export default function GenerateImageLogButton() {
  const promptLog = useAIImageGeneratorStore((state) => state.promptLog);
  const setPrompt = useAIImageGeneratorStore((state) => state.setPrompt);

  return (
    <TooltipTrigger delay={1000}>
      <DialogTrigger isDismissable>
        <ActionButton>
          <Images /> <Text>{promptLog.length}</Text>
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
                  setPrompt(promptLog[Number(key)]);
                  close();
                }}
              >
                {promptLog.map((prompt, index) => (
                  <Item key={index}>{prompt.prompt}</Item>
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
