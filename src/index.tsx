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
// Supports weights 100-900
import '@fontsource-variable/jost';
// Supports weights 300-700
import '@fontsource-variable/space-grotesk';
// Supports weights 100-900
import '@fontsource-variable/outfit';
// Supports weights 100-900
import '@fontsource-variable/urbanist';
// Supports weights 200-800
import '@fontsource-variable/manrope';
// Supports weights 100-800
import '@fontsource-variable/sora';
// Supports weights 400-800
import '@fontsource-variable/syne';
// Supports weights 200-800
import '@fontsource-variable/newsreader';
// Supports weights 100-900
import '@fontsource-variable/fraunces';
// Supports weights 300-900
import '@fontsource-variable/figtree';
import { preloadSupportedFonts } from "./Editor/Lyrics/LyricPreview/fontLoad";

// Use createRoot to manage the root of your app
import { createRoot } from "react-dom/client";

void preloadSupportedFonts();

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
