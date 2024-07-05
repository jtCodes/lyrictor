import { Analytics } from "@vercel/analytics/react";
import "./App.css";
import LyricEditor from "./Editor/LyricEditor";
import { defaultTheme, Provider } from "@adobe/react-spectrum";
import {ToastContainer } from '@react-spectrum/toast'
import { AudioPlayerProvider } from "react-use-audio-player";
import { useEffect, useState } from "react";
import { auth } from "./api/firebase";
import { User } from "firebase/auth";
import LogInButton from "./Auth/LogInButton";
import LogInPage from "./Auth/LogInPage";
import CreateNewProject from "./Project/CreateNewProjectForm";
import Homepage from "./Homepage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
  },
  {
    path: "/edit",
    element: (
      <AudioPlayerProvider>
        <LyricEditor />
      </AudioPlayerProvider>
    ),
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
        {/* {user ? (
          <AudioPlayerProvider>
            <LyricEditor user={user} />
          </AudioPlayerProvider>
        ) : (
          <LogInPage />
        )} */}
        <RouterProvider router={router} />
        <Analytics />
      </div>
    </Provider>
  );
}

export default App;
