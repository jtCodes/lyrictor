import { View } from "@adobe/react-spectrum";

export const CUSTOMIZATION_PANEL_WIDTH = 200;
const HEADER_HEIGHT = 25;

export default function LyricTextCustomizationToolPanel({
  height,
}: {
  height: number;
}) {
  return (
    <View
      width={CUSTOMIZATION_PANEL_WIDTH}
      height={height}
      backgroundColor={"gray-200"}
      overflow={"hidden hidden"}
    >
      <View height={HEADER_HEIGHT} backgroundColor={"gray-200"}>
        <span style={{ fontWeight: 600 }}>Customize Text</span>
      </View>
      <View overflow={"hidden auto"} height={height - HEADER_HEIGHT}>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
        <View>haha</View>
      </View>
    </View>
  );
}
