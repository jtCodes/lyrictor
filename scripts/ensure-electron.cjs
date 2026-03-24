const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const electronDir = path.join(__dirname, "..", "node_modules", "electron");
const pathFile = path.join(electronDir, "path.txt");
const installScript = path.join(electronDir, "install.js");

function isInstalled() {
  if (!fs.existsSync(pathFile)) {
    return false;
  }

  const executablePath = fs.readFileSync(pathFile, "utf8").trim();
  if (!executablePath) {
    return false;
  }

  return fs.existsSync(path.join(electronDir, "dist", executablePath));
}

if (!fs.existsSync(installScript)) {
  console.error("Electron package is missing install.js. Run yarn install first.");
  process.exit(1);
}

if (isInstalled()) {
  process.exit(0);
}

console.log("Electron binary missing. Running installer...");

const result = spawnSync(process.execPath, [installScript], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0 || !isInstalled()) {
  console.error("Electron install did not complete successfully.");
  process.exit(result.status || 1);
}

console.log("Electron binary installed.");