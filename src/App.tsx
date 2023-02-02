import "./App.css";
import LyricEditor from "./Editor/Lyrics/LyricEditor";
import { Button, defaultTheme, Provider } from "@adobe/react-spectrum";
import { AudioPlayerProvider } from "react-use-audio-player";
import { useEffect, useState } from "react";
import { auth } from "./api/firebase";
import { User } from "firebase/auth";
import { Analytics } from '@vercel/analytics/react';
import LogInButton from "./Auth/LogInButton";
import LogInPage from "./Auth/LogInPage";
import CreateNewProject from "./Project/CreateNewProjectForm";
import ProjectSelectionScreen from "./Project/ProjectSelectionScreen";
import Home from "./Home/Home";

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
        <Analytics />
        {/* {user ? (
          <AudioPlayerProvider>
            <LyricEditor user={user} />
          </AudioPlayerProvider>
        ) : (
          <LogInPage />
        )} */}
        <AudioPlayerProvider>
          {/* <Home /> */}
          <LyricEditor user={user} />
        </AudioPlayerProvider>
      </div>
    </Provider>
  );
}

export default App;
