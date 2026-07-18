import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import { defaultTheme, Provider } from "@adobe/react-spectrum";
import { ToastContainer } from "@react-spectrum/toast";
import { useEffect } from "react";
import { auth } from "./api/firebase";
import { useAuthStore } from "./Auth/store";
import { useOpenRouterStore } from "./api/openRouterStore";
import DesktopSignInSuccessModal from "./Auth/DesktopSignInSuccessModal";
import ProjectActionOverlay from "./Project/ProjectActionOverlay";
import SetUsernameModal from "./Auth/SetUsernameModal";
import { isDesktopApp } from "./platform";
import AppRouter from "./AppRouter";

function App() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      useAuthStore.setState({ username: null, storagePreference: "cloud" });
      useOpenRouterStore.getState().resetApiKey();
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
          <AppRouter />
          <SetUsernameModal />
          <DesktopSignInSuccessModal />
        </>
        <ProjectActionOverlay />
        {!isDesktopApp ? <Analytics /> : null}
      </div>
    </Provider>
  );
}

export default App;
