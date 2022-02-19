import React from "react";
import logo from "./logo.svg";
import "./App.css";
import LyricEditor from "./Editor/LyricEditor";
import { Button, defaultTheme, Provider } from "@adobe/react-spectrum";
import { AudioPlayerProvider } from "react-use-audio-player";

function App() {
  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className="App">
        <AudioPlayerProvider>
          <LyricEditor />
        </AudioPlayerProvider>
      </div>
    </Provider>
  );
}

export default App;
