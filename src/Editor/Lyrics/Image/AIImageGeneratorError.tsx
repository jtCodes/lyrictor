import { View, Well, Link, Text } from "@adobe/react-spectrum";

export default function AIImageGeneratorError() {
  return (
    <View>
      <View>
        <Text>
          <span style={{ color: "red", fontWeight: "bold" }}>
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
        <Text>
          Close and re-open this component to refresh the status. 
        </Text>
      </View>
    </View>
  );
}
