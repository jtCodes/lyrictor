import { View, Well, Link, Text, Button, Flex, Divider } from "@adobe/react-spectrum";
import { authenticateWithOpenRouter } from "../../../api/openRouter";
import { useOpenRouterStore } from "../../../api/openRouterStore";

export default function AIImageGeneratorError() {
  const setApiKey = useOpenRouterStore((state) => state.setApiKey);

  async function handleSignIn() {
    const key = await authenticateWithOpenRouter();
    if (key) {
      setApiKey(key);
    }
  }

  return (
    <View>
      <Flex direction="column" gap="size-300">
        <View>
          <Text>
            <span style={{ fontWeight: "bold" }}>
              Sign in with OpenRouter to generate images using cloud AI models
            </span>
          </Text>
          <br />
          <Text>
            OpenRouter connects you to models like GPT-5 Image, Gemini, and
            more. You pay only for what you use through your own OpenRouter
            account.
          </Text>
          <br />
          <br />
          <Button
            variant="accent"
            onPress={handleSignIn}
          >
            <Text>Sign in with OpenRouter</Text>
          </Button>
        </View>

        <Divider size="S" />

        <View>
          <Text>
            <span style={{ fontWeight: "bold", opacity: 0.7 }}>
              Or use local Stable Diffusion
            </span>
          </Text>
          <br />
          <Text UNSAFE_style={{ opacity: 0.7 }}>
            <span style={{ color: "red" }}>
              !! stable-diffusion-webui not detected !!
            </span>
          </Text>
          <br />
          <Link>
            <a
              href="https://github.com/AUTOMATIC1111/stable-diffusion-webui"
              target="_blank"
            >
              https://github.com/AUTOMATIC1111/stable-diffusion-webui
            </a>
          </Link>
          <br />
          <br />
          Make sure:
          <Well>
            <ul>
              <li>
                <span>stable-diffusion-webui is running with command</span>{" "}
                <Well>
                  <span style={{ fontStyle: "italic" }}>
                    {" "}
                    --cors-allow-origins "*"
                  </span>
                </Well>
                for example:
                <Well>./webui.sh --cors-allow-origins "*"</Well>
                <br></br>
              </li>
              <li>this not running on Safari</li>
            </ul>
          </Well>
          <br />
          <Text>Close and re-open this component to refresh the status.</Text>
        </View>
      </Flex>
    </View>
  );
}
