import React from "react";
import logo from "./logo.svg";
import "./App.css";
import LyricEditor from "./Editor/LyricEditor";
import { Button, defaultTheme, Provider } from "@adobe/react-spectrum";

function App() {
  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <div className="App">
        <LyricEditor />
      </div>
    </Provider>
  );
}

export default App;
