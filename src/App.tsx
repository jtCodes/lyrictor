import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import { defaultTheme, Flex, Heading, Provider, Text, View } from "@adobe/react-spectrum";
import { ToastContainer } from "@react-spectrum/toast";
import { AudioPlayerProvider } from "react-use-audio-player";
import { useEffect } from "react";
import { auth } from "./api/firebase";
import { useAuthStore } from "./Auth/store";
import { useOpenRouterStore } from "./api/openRouterStore";
import Homepage from "./Homepage";
import {
  createBrowserRouter,
  createHashRouter,
  Link,
  RouterProvider,
} from "react-router-dom";
import LyricEditor from "./Editor/LyricEditor";
import OAuthCallback from "./Auth/OAuthCallback";
import ProfilePage from "./Auth/ProfilePage";
import DesktopSignInSuccessModal from "./Auth/DesktopSignInSuccessModal";
import ProjectActionOverlay from "./Project/ProjectActionOverlay";
import PublishedLyrictorPage from "./Project/PublishedLyrictorPage";
import { isMobile } from "./utils";
import SetUsernameModal from "./Auth/SetUsernameModal";
import { isDesktopApp } from "./platform";

const routes = [
  {
    path: "/",
    element: (
      <AudioPlayerProvider>
        <Homepage />
      </AudioPlayerProvider>
    ),
  },
  {
    path: "/edit",
    element: isMobile ? (
      <MobileNotSupportedView />
    ) : (
      <AudioPlayerProvider>
        <LyricEditor />
      </AudioPlayerProvider>
    ),
  },
  {
    path: "/user/:username",
    element: <ProfilePage />,
  },
  {
    path: "/lyrictor/:publishedId",
    element: (
      <AudioPlayerProvider>
        <PublishedLyrictorPage />
      </AudioPlayerProvider>
    ),
  },
  {
    path: "/auth/callback",
    element: <OAuthCallback />,
  },
];

const router = isDesktopApp
  ? createHashRouter(routes)
  : createBrowserRouter(routes);

function App() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      useAuthStore.setState({ username: null, storagePreference: "cloud" });
      useOpenRouterStore.setState({ apiKey: null });
      useAuthStore.getState().setUsernameLoaded(false);
      if (user) {
        await useAuthStore.getState().loadUserSettings();
        if (!useAuthStore.getState().username) {
          useAuthStore.getState().setUsernameLoaded(true);
        }
      }
      useAuthStore.getState().setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className="App">
        <ToastContainer />
        <>
          <RouterProvider router={router} />
          <SetUsernameModal />
        </>
        <ProjectActionOverlay />
        {!isDesktopApp ? <Analytics /> : null}
      </div>
    </Provider>
  );
}

function MobileNotSupportedView() {
  return (
    <View
      minHeight="100vh"
      backgroundColor="gray-75"
      UNSAFE_style={{
        padding: 24,
        background:
          "radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 42%), linear-gradient(180deg, rgb(16, 18, 22) 0%, rgb(8, 10, 14) 100%)",
      }}
    >
      <Flex alignItems="center" justifyContent="center" height="100vh">
        <View
          maxWidth={460}
          width="100%"
          padding="size-400"
          UNSAFE_style={{
            background: "rgba(255, 255, 255, 0.04)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 24px 80px rgba(0, 0, 0, 0.32)",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
            maskImage:
              "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <Flex direction="column" gap="size-250" alignItems="start">
            <Text
              UNSAFE_style={{
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.52)",
              }}
            >
              Editor on desktop only
            </Text>
            <Heading
              level={2}
              margin={0}
              UNSAFE_style={{
                color: "rgba(255, 255, 255, 0.94)",
                lineHeight: 1.05,
                fontSize: 30,
                maxWidth: 380,
              }}
            >
              Editing is not available on mobile yet
            </Heading>
            <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.72)", lineHeight: 1.6 }}>
              You can still browse projects and published pages on this device, but
              the editor needs a desktop or laptop browser for now.
            </Text>
            <Text UNSAFE_style={{ color: "rgba(255, 255, 255, 0.46)", lineHeight: 1.6 }}>
              Reopen Lyrictor on a larger screen to keep working on your project.
            </Text>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 999,
                textDecoration: "none",
                color: "rgba(255, 255, 255, 0.92)",
                background: "rgba(255, 255, 255, 0.1)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                fontSize: 13,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              Back to homepage
            </Link>
          </Flex>
        </View>
      </Flex>
    </View>
  );
}

export default App;
