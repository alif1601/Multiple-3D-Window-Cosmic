import * as THREE from "three";
import type { Palette, WindowState } from "../types";
import { BridgeSystem } from "../objects/BridgeSystem";
import { CosmicAtom } from "../objects/CosmicAtom";
import { ParticleSystem } from "../objects/ParticleSystem";
import { MagneticField } from "../objects/MagneticField";
import { WindowManager } from "./WindowManager";

const LEFT_SCALE = 0.88;
const RIGHT_SCALE = 0.68;

class SceneManager {
  public readonly scene = new THREE.Scene();

  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly atoms = new Map<string, CosmicAtom>();
  private readonly bridge = new BridgeSystem();
  private readonly particles = new ParticleSystem();
  private readonly magnetic = new MagneticField();

  private palette: Palette;
  private isUltra = true;
  private lastFrame = performance.now();
  private fps = 60;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly windowManager: WindowManager,
    palettes: Palette[]
  ) {
    this.palette = palettes[0];

    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      0.1,
      5000
    );

    this.camera.position.set(0, 0, 1200);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.setupLights();

    this.particles.createStarField();
    this.scene.add(this.particles.group);
    this.scene.add(this.bridge.group);

    window.addEventListener("resize", () => this.resize());

    window.addEventListener("pointermove", (event) => {
      this.magnetic.setPointerFromClient(event.clientX, event.clientY);
    });

    window.addEventListener("pointerleave", () => {
      this.magnetic.deactivate();
    });

    this.windowManager.addEventListener("window-remove", (event) => {
      const id = (event as CustomEvent<{ id: string }>).detail.id;
      this.removeAtom(id);
    });
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
  }

  toggleQuality(): boolean {
    this.isUltra = !this.isUltra;

    this.renderer.setPixelRatio(
      this.isUltra ? Math.min(window.devicePixelRatio, 2) : 1
    );

    return this.isUltra;
  }

  createBurst(x: number, y: number, z = 0): void {
    const local = this.globalToLocal(x, y);

    this.particles.createBurst(local.x, local.y, z, [
      this.palette.outer,
      this.palette.inner,
      this.palette.third
    ]);
  }

  update(time: number): void {
    const now = performance.now();
    const delta = now - this.lastFrame;
    this.lastFrame = now;

    this.fps = this.fps * 0.9 + (1000 / Math.max(delta, 1)) * 0.1;

    this.windowManager.updateSelf();
    this.windowManager.cleanup();

    this.magnetic.update();

    const globalWindows = this.windowManager.getSortedWindows();
    const localWindows = this.convertWindowsToLocal(globalWindows);

    const magneticWindows = this.applyMagneticToWindows(localWindows);

    this.updateCamera();
    this.syncAtoms(magneticWindows);

    this.bridge.update(
      magneticWindows,
      this.palette,
      (index) => (index % 2 === 0 ? LEFT_SCALE : RIGHT_SCALE),
      time
    );

    for (const atom of this.atoms.values()) {
      atom.update(time);
    }

    this.particles.update();

    this.renderer.render(this.scene, this.camera);
  }

  getDebugStats() {
    return {
      fps: this.fps,
      windowId: this.windowManager.id,
      connectedWindows: this.windowManager.windows.size,
      cameraX: this.camera.position.x,
      cameraY: this.camera.position.y,
      palette: this.palette.name,
      quality: this.isUltra ? "Ultra" : "Fast",
      objects: this.scene.children.length
    };
  }

  private applyMagneticToWindows(windows: WindowState[]): WindowState[] {
    return windows.map((win, index) => {
      const centerX = win.x + win.w / 2;
      const centerY = -(win.y + win.h / 2);

      const scale = index % 2 === 0 ? LEFT_SCALE : RIGHT_SCALE;
      const offset = this.magnetic.getAtomOffset(centerX, centerY, scale);

      const newCenterX = centerX + offset.x;
      const newCenterY = centerY + offset.y;

      return {
        ...win,
        x: newCenterX - win.w / 2,
        y: -newCenterY - win.h / 2
      };
    });
  }

  private convertWindowsToLocal(windows: WindowState[]): WindowState[] {
    const current = this.windowManager.getViewportRect();

    const currentCenterX = current.x + current.w / 2;
    const currentCenterY = current.y + current.h / 2;

    return windows.map((win) => {
      const winCenterX = win.x + win.w / 2;
      const winCenterY = win.y + win.h / 2;

      const localCenterX = winCenterX - currentCenterX;
      const localCenterY = -(winCenterY - currentCenterY);

      return {
        ...win,
        x: localCenterX - win.w / 2,
        y: -localCenterY - win.h / 2
      };
    });
  }

  private globalToLocal(
    globalX: number,
    globalY: number
  ): { x: number; y: number } {
    const current = this.windowManager.getViewportRect();

    const currentCenterX = current.x + current.w / 2;
    const currentCenterY = current.y + current.h / 2;

    return {
      x: globalX - currentCenterX,
      y: -(globalY - currentCenterY)
    };
  }

  private syncAtoms(windows: WindowState[]): void {
    const activeIds = new Set(windows.map((w) => w.id));

    for (const id of this.atoms.keys()) {
      if (!activeIds.has(id)) {
        this.removeAtom(id);
      }
    }

    windows.forEach((win, index) => {
      let atom = this.atoms.get(win.id);

      if (!atom) {
        atom = new CosmicAtom(
          this.palette.outer,
          this.palette.inner,
          this.palette.third
        );

        this.atoms.set(win.id, atom);
        this.scene.add(atom.group);
      }

      const targetX = win.x + win.w / 2;
      const targetY = -(win.y + win.h / 2);

      if (!atom.initialized) {
        atom.group.position.set(targetX, targetY, 0);
        atom.initialized = true;
      }

      atom.group.position.x += (targetX - atom.group.position.x) * 0.25;
      atom.group.position.y += (targetY - atom.group.position.y) * 0.25;

      const outerColor =
        index % 2 === 0 ? this.palette.outer : this.palette.inner;

      const innerColor =
        index % 2 === 0 ? this.palette.inner : this.palette.outer;

      atom.setColors(outerColor, innerColor, this.palette.third);
      atom.baseScale = index % 2 === 0 ? LEFT_SCALE : RIGHT_SCALE;
      atom.sideIndex = index;
    });
  }

  private removeAtom(id: string): void {
    const atom = this.atoms.get(id);

    if (!atom) return;

    this.scene.remove(atom.group);
    atom.dispose();
    this.atoms.delete(id);
  }

  private setupLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.78));

    const light1 = new THREE.PointLight(0x00ff8c, 4.8, 5200);
    light1.position.set(-500, 250, 900);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xff003c, 4.8, 5200);
    light2.position.set(500, -220, 900);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0x7a3cff, 3, 4200);
    light3.position.set(0, 300, 800);
    this.scene.add(light3);
  }

  private updateCamera(): void {
    this.camera.left = -window.innerWidth / 2;
    this.camera.right = window.innerWidth / 2;
    this.camera.top = window.innerHeight / 2;
    this.camera.bottom = -window.innerHeight / 2;

    this.camera.position.set(0, 0, 1200);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateCamera();
  }
}

export default SceneManager;