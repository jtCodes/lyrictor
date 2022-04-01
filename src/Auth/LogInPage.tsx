import { Flex, View } from "@adobe/react-spectrum";
import React from "react";
import LogInButton from "./LogInButton";

export default function LogInPage() {
  return (
    <View>
      <Flex
        height={"100vh"}
        direction="column"
        alignItems={"center"}
        justifyContent={"center"}
      >
        <View width={"size-2900"}> 
          <LogInButton />
        </View>
      </Flex>
    </View>
  );
}
