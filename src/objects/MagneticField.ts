import * as THREE from "three";

export interface MagneticOffset {
  x: number;
  y: number;
  intensity: number;
}

export class MagneticField {
  private readonly pointer = new THREE.Vector2(999999, 999999);
  private readonly smoothPointer = new THREE.Vector2(999999, 999999);

  private active = false;

  private readonly radius = 360;
  private readonly maxPull = 42;

  setPointerFromClient(clientX: number, clientY: number): void {
    this.pointer.x = clientX - window.innerWidth / 2;
    this.pointer.y = -(clientY - window.innerHeight / 2);
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
    this.pointer.set(999999, 999999);
  }

  update(): void {
    this.smoothPointer.lerp(this.pointer, 0.12);
  }

  getAtomOffset(atomX: number, atomY: number, scale = 1): MagneticOffset {
    if (!this.active) {
      return { x: 0, y: 0, intensity: 0 };
    }

    const dx = this.smoothPointer.x - atomX;
    const dy = this.smoothPointer.y - atomY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.radius || distance < 0.001) {
      return { x: 0, y: 0, intensity: 0 };
    }

    const power = 1 - distance / this.radius;
    const intensity = power * power;

    const pull = this.maxPull * intensity * scale;

    return {
      x: (dx / distance) * pull,
      y: (dy / distance) * pull,
      intensity
    };
  }
}