import "./App.css";
import LyricEditor from "./Editor/LyricEditor";
import { Button, defaultTheme, Provider } from "@adobe/react-spectrum";
import { AudioPlayerProvider } from "react-use-audio-player";
import { useEffect, useState } from "react";
import { auth } from "./api/firebase";
import { User } from "firebase/auth";
import LogInButton from "./Auth/LogInButton";
import LogInPage from "./Auth/LogInPage";
import CreateNewProject from "./CreateProject/CreateNewProjectForm";
import ProjectSelectionScreen from "./CreateProject/ProjectSelectionScreen";

function App() {
  const [user, setUser] = useState<User | null>();

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      setUser(user);
    });
  }, []);

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className="App">
        {user ? (
          <AudioPlayerProvider>
            <LyricEditor user={user} />
          </AudioPlayerProvider>
        ) : (
          <LogInPage />
        )}
      </div>
    </Provider>
  );
}

export default App;
