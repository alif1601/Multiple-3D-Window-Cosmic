import "./styles.css";
import type { Palette } from "./types";
import SceneManager from "./core/SceneManager";
import { UIManager } from "./ui/UIManager";
import { WindowManager } from "./core/WindowManager";

const palettes: Palette[] = [
  { outer: 0x00ff8c, inner: 0xff003c, third: 0x7a3cff, name: "green-red" },
  { outer: 0x00eaff, inner: 0xff00aa, third: 0xffffff, name: "cyan-pink" },
  { outer: 0xffcc00, inner: 0x6a5cff, third: 0x00ffaa, name: "gold-blue" },
  { outer: 0x66ff00, inner: 0xff3300, third: 0x00ffff, name: "acid-fire" }
];

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Missing #scene canvas");
}

const windowManager = new WindowManager();
const sceneManager = new SceneManager(canvas, windowManager, palettes);
const ui = new UIManager();

let paletteIndex = 0;

ui.addEventListener("open-window", () => {
  console.log("Open Window clicked");
  windowManager.openWindow();
});

ui.addEventListener("palette", () => {
  console.log("Palette clicked");

  paletteIndex = (paletteIndex + 1) % palettes.length;

  sceneManager.setPalette(palettes[paletteIndex]);
  windowManager.broadcastPalette(paletteIndex);
});

ui.addEventListener("quality", () => {
  console.log("Quality clicked");

  const isUltra = sceneManager.toggleQuality();
  ui.setQualityLabel(isUltra);
});

windowManager.addEventListener("palette", (event) => {
  const index = (event as CustomEvent<{ index: number }>).detail.index;

  if (Number.isInteger(index) && palettes[index]) {
    paletteIndex = index;
    sceneManager.setPalette(palettes[index]);
  }
});

windowManager.addEventListener("burst", (event) => {
  const { x, y, z } = (event as CustomEvent<{
    x: number;
    y: number;
    z: number;
  }>).detail;

  sceneManager.createBurst(x, y, z);
});

window.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;

  if (target?.closest("button")) return;

  const rect = windowManager.getViewportRect();

  const x = rect.x + event.clientX;
  const y = -(rect.y + event.clientY);

  sceneManager.createBurst(x, y, 0);
  windowManager.broadcastBurst(x, y, 0);
});

function animate(time = 0): void {
  requestAnimationFrame(animate);

  sceneManager.update(time);
  ui.updateDebug(sceneManager.getDebugStats());
}

animate();