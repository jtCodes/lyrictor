import { resetMobilePageFullscreen } from "./fullscreen";
import { Flex, Heading, Text, View } from "@adobe/react-spectrum";
import { AudioPlayerProvider } from "react-use-audio-player";
import { PlaybackPreparationProvider } from "./Project/PlaybackPreparationProvider";
import {
  createBrowserRouter,
  createHashRouter,
  Link,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import OAuthCallback from "./Auth/OAuthCallback";
import ProfilePage from "./Auth/ProfilePage";
import LyricEditor from "./Editor/LyricEditor";
import Homepage from "./Homepage";
import { isDesktopApp } from "./platform";
import PublishedLyrictorPage from "./Project/PublishedLyrictorPage";
import { useDocumentTitle } from "./useDocumentTitle";
import { isMobile } from "./utils";

const routes = [
  {
    path: "/",
    element: (
      <AudioPlayerProvider>
        <PlaybackPreparationProvider>
          <Homepage />
        </PlaybackPreparationProvider>
      </AudioPlayerProvider>
    ),
  },
  {
    path: "/edit",
    element: isMobile ? (
      <MobileNotSupportedView />
    ) : (
      <AudioPlayerProvider>
        <PlaybackPreparationProvider>
          <LyricEditor />
        </PlaybackPreparationProvider>
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
        <PlaybackPreparationProvider>
          <PublishedLyrictorPage />
        </PlaybackPreparationProvider>
      </AudioPlayerProvider>
    ),
  },
  {
    path: "/auth/callback",
    element: <OAuthCallback />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

const router = isDesktopApp
  ? createHashRouter(routes)
  : createBrowserRouter(routes);

// Mobile expanded-page mode belongs to its route. Preserve native desktop fullscreen.
let fullscreenLocationKey = router.state.location.key;
router.subscribe(state => {
  if (state.location.key === fullscreenLocationKey) return;
  fullscreenLocationKey = state.location.key;
  resetMobilePageFullscreen();
});

export default function AppRouter() {
  return <RouterProvider router={router} />;
}

function MobileNotSupportedView() {
  useDocumentTitle("Editor Unavailable on Mobile");

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
