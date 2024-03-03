import { Heading, Text, View } from "@adobe/react-spectrum";
import "./Project.css";

export default function ProjectCard() {
  return (
    <View
      UNSAFE_className="card"
      padding="size-200"
      borderWidth="thin"
      borderColor="gray-200"
      borderRadius="medium"
      width="size-2400"
      backgroundColor={"gray-100"}
    >
      <Heading level={6} UNSAFE_style={{ fontWeight: 600 }}>
        Title
      </Heading>
      <Text>Here is some description text.</Text>
    </View>
  );
}
