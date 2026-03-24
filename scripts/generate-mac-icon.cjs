const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Resvg } = require("@resvg/resvg-js");

const projectRoot = path.join(__dirname, "..");
const sourceSvg = path.join(projectRoot, "public", "favicon.svg");
const electronDir = path.join(projectRoot, "electron");
const iconsetDir = path.join(electronDir, "icon.iconset");
const sourcePng = path.join(electronDir, "favicon.svg.png");
const outputIcns = path.join(electronDir, "icon.icns");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function ensureCommand(command) {
  const result = spawnSync("command", ["-v", command], {
    shell: true,
    stdio: "ignore",
  });

  if (result.status !== 0) {
    console.error(`${command} is required to generate the macOS app icon.`);
    process.exit(1);
  }
}

ensureCommand("sips");
ensureCommand("iconutil");

fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.rmSync(sourcePng, { force: true });
fs.mkdirSync(iconsetDir, { recursive: true });

const svg = fs.readFileSync(sourceSvg, "utf8");
const resvg = new Resvg(svg, {
  fitTo: {
    mode: "width",
    value: 1024,
  },
  background: "rgba(0, 0, 0, 0)",
});
const pngData = resvg.render();

fs.writeFileSync(sourcePng, pngData.asPng());

if (!fs.existsSync(sourcePng)) {
  console.error("Failed to rasterize public/favicon.svg into a 1024px PNG.");
  process.exit(1);
}

const iconSizes = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
];

for (const [size, fileName] of iconSizes) {
  run("sips", [
    "-z",
    String(size),
    String(size),
    sourcePng,
    "--out",
    path.join(iconsetDir, fileName),
  ]);
}

fs.copyFileSync(sourcePng, path.join(iconsetDir, "icon_512x512@2x.png"));
run("iconutil", ["-c", "icns", iconsetDir, "-o", outputIcns]);

fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.rmSync(sourcePng, { force: true });

if (!fs.existsSync(outputIcns)) {
  console.error("Failed to generate electron/icon.icns.");
  process.exit(1);
}