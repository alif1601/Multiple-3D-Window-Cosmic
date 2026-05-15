import type { DebugStats } from "../types";

export class UIManager extends EventTarget {
  private readonly debugPanel: HTMLElement;
  private readonly qualityBtn: HTMLButtonElement;
  private debugVisible = false;

  constructor() {
    super();

    this.debugPanel = this.required<HTMLElement>("#debugPanel");
    this.qualityBtn = this.required<HTMLButtonElement>("#qualityBtn");

    const openBtn = this.required<HTMLButtonElement>("#openWindow");
    const paletteBtn = this.required<HTMLButtonElement>("#paletteBtn");
    const debugBtn = this.required<HTMLButtonElement>("#debugBtn");

    openBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.emit("open-window");
    });

    paletteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.emit("palette");
    });

    this.qualityBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.emit("quality");
    });

    debugBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      this.debugVisible = !this.debugVisible;
      this.debugPanel.style.display = this.debugVisible ? "block" : "none";
    });
  }

  setQualityLabel(isUltra: boolean): void {
    this.qualityBtn.textContent = isUltra ? "Quality: Ultra" : "Quality: Fast";
  }

  updateDebug(stats: DebugStats): void {
    if (!this.debugVisible) return;

    this.debugPanel.innerHTML = `
      <b>Debug Mode</b><br>
      FPS: ${stats.fps.toFixed(0)}<br>
      Window ID: ${stats.windowId.slice(0, 8)}<br>
      Connected Windows: ${stats.connectedWindows}<br>
      Camera X: ${Math.round(stats.cameraX)}<br>
      Camera Y: ${Math.round(stats.cameraY)}<br>
      Palette: ${stats.palette}<br>
      Quality: ${stats.quality}<br>
      Objects: ${stats.objects}
    `;
  }

  private emit(name: string): void {
    this.dispatchEvent(new Event(name));
  }

  private required<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);

    if (!element) {
      throw new Error(`Missing UI element: ${selector}`);
    }

    return element;
  }
}