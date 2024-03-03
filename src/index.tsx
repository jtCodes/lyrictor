import "./index.css";
import App from "./App";

// Use createRoot to manage the root of your app
import { createRoot } from "react-dom/client";
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
