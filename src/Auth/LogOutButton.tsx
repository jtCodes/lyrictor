import { ActionButton } from "@adobe/react-spectrum";
import { Text } from "@adobe/react-spectrum";
import { auth, googleProvider } from "../api/firebase";
import React from "react";

export default function LogOutButton() {
  return (
    <ActionButton
      onPress={() => {
        auth.signOut();
      }}
    >
      <Text>Logout</Text>
    </ActionButton>
  );
}
