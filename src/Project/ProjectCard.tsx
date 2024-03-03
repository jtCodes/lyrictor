import { Heading, Text, View } from "@adobe/react-spectrum";
import "./Project.css";

export default function ProjectCard() {
  return (
    <View
      UNSAFE_className="card"
      padding="size-200"
      borderWidth="thin"
      borderColor="dark"
      borderRadius="medium"
      width="size-2400"
    >
      <Heading level={6}>Title</Heading>
      <Text>Here is some description text.</Text>
    </View>
  );
}
