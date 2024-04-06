import "./index.css";
import App from "./App";

import '@fontsource-variable/inter';
// Supports weights 300-800
import '@fontsource-variable/open-sans';
// Supports weights 100-900
import '@fontsource-variable/montserrat';
// Supports weights 400-700
import '@fontsource-variable/dancing-script';
// Supports weights 400-700
import '@fontsource-variable/caveat';
// Supports weights 300-900
import '@fontsource-variable/merienda';
// Supports weights 100-900
import '@fontsource-variable/big-shoulders-inline-display';
// Supports weights 400-700
import '@fontsource-variable/edu-nsw-act-foundation';
// Supports weights 300-900
import '@fontsource-variable/darker-grotesque';
// Supports weights 300-900
import '@fontsource-variable/red-hat-display';
// Supports weights 300-700
import '@fontsource-variable/comfortaa';
// Supports weights 100-700
import '@fontsource-variable/roboto-mono';

// Use createRoot to manage the root of your app
import { createRoot } from "react-dom/client";
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
