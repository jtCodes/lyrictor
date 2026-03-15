import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import { defaultTheme, Flex, Heading, Provider, Text, View } from "@adobe/react-spectrum";
import { ToastContainer } from "@react-spectrum/toast";
import { AudioPlayerProvider } from "react-use-audio-player";
import { useEffect, useState } from "react";
import { auth } from "./api/firebase";
import { User } from "firebase/auth";
import Homepage from "./Homepage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LyricEditor from "./Editor/LyricEditor";
import { isMobile } from "./utils";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
  },
  {
    path: "/edit",
    element: <LyricEditor />,
  },
]);

function App() {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      }
    });
  }, []);

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className="App">
        <ToastContainer />
        {isMobile ? (
          <MobileNotSupportedView />
        ) : (
          <AudioPlayerProvider>
            <RouterProvider router={router} />
          </AudioPlayerProvider>
        )}
        <Analytics />
      </div>
    </Provider>
  );
}

function MobileNotSupportedView() {
  return (
    <View
      minHeight="100vh"
      backgroundColor="gray-75"
      UNSAFE_style={{ padding: 24 }}
    >
      <Flex alignItems="center" justifyContent="center" height="100vh">
        <View
          maxWidth={420}
          width="100%"
          backgroundColor="gray-50"
          borderRadius="large"
          padding="size-400"
          borderWidth="thin"
          borderColor="gray-300"
          UNSAFE_style={{ boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)" }}
        >
          <Flex direction="column" gap="size-250" alignItems="start">
            <Text UNSAFE_style={{ fontSize: 12, letterSpacing: 1.2, opacity: 0.7 }}>
              MOBILE NOTICE
            </Text>
            <Heading level={2} margin={0}>
              Mobile is not supported yet
            </Heading>
            <Text>
              Lyrictor currently requires a desktop or laptop browser. The mobile
              editor and preview controls are not ready yet.
            </Text>
            <Text>
              Please reopen this app on a larger screen for now.
            </Text>
          </Flex>
        </View>
      </Flex>
    </View>
  );
}

export default App;
