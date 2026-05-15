import * as THREE from "three";
import type { Palette, WindowState } from "../types";

const BALL_RADIUS = 105;

export class BridgeSystem {
  public readonly group = new THREE.Group();

  update(
    windows: WindowState[],
    palette: Palette,
    scaleForIndex: (index: number) => number,
    time: number
  ): void {
    this.clear();

    if (windows.length < 2) return;

    for (let i = 0; i < windows.length - 1; i++) {
      const aWin = windows[i];
      const bWin = windows[i + 1];

      const aCenter = new THREE.Vector3(
        aWin.x + aWin.w / 2,
        -(aWin.y + aWin.h / 2),
        0
      );

      const bCenter = new THREE.Vector3(
        bWin.x + bWin.w / 2,
        -(bWin.y + bWin.h / 2),
        0
      );

      const direction = new THREE.Vector3()
        .subVectors(bCenter, aCenter)
        .normalize();

      const a = aCenter
        .clone()
        .add(direction.clone().multiplyScalar(BALL_RADIUS * scaleForIndex(i) * 0.86));

      const b = bCenter
        .clone()
        .add(direction.clone().multiplyScalar(-BALL_RADIUS * scaleForIndex(i + 1) * 0.86));

      const mid = new THREE.Vector3(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        -76
      );

      const curve = new THREE.CatmullRomCurve3([a, mid, b]);

      this.group.add(
        this.tube(curve, 8, palette.outer, 0.105),
        this.tube(curve, 5, palette.inner, 0.13),
        this.tube(curve, 2.5, palette.outer, 0.23),
        this.smoke(curve, palette, time, i),
        this.lightning(curve, palette.outer, time, i),
        this.lightning(curve, palette.inner, time + 300, i + 5),
        ...this.singularity(mid, palette, time, i)
      );
    }
  }

  dispose(): void {
    this.clear();
  }

  private tube(
    curve: THREE.Curve<THREE.Vector3>,
    radius: number,
    color: number,
    opacity: number
  ): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, radius, 22, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  private smoke(
    curve: THREE.Curve<THREE.Vector3>,
    palette: Palette,
    time: number,
    index: number
  ): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c1 = new THREE.Color(palette.outer);
    const c2 = new THREE.Color(palette.inner);
    const c3 = new THREE.Color(palette.third);

    for (let i = 0; i < count; i++) {
      const t = (i / count + time * 0.00023 + index * 0.13) % 1;
      const p = curve.getPointAt(t);
      const spread = 14;

      positions[i * 3] = p.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = p.y + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;

      const c = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 3.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  private lightning(
    curve: THREE.Curve<THREE.Vector3>,
    color: number,
    time: number,
    index: number
  ): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 26;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPointAt(t);
      const flicker = Math.sin(time * 0.02 + i * 8 + index * 13);
      const offset = flicker * 7 + (Math.random() - 0.5) * 7;

      points.push(
        new THREE.Vector3(
          p.x + offset,
          p.y + (Math.random() - 0.5) * 10,
          p.z + (Math.random() - 0.5) * 10
        )
      );
    }

    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.43,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  private singularity(
    position: THREE.Vector3,
    palette: Palette,
    time: number,
    index: number
  ): THREE.Object3D[] {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x020006,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      })
    );

    core.position.copy(position).add(new THREE.Vector3(0, 0, 20));

    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(45, 3, 12, 100),
      new THREE.MeshBasicMaterial({
        color: palette.outer,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ringA.position.copy(position).add(new THREE.Vector3(0, 0, 12));
    ringA.rotation.x = Math.PI / 2.25;
    ringA.rotation.z = time * 0.002 + index;

    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(65, 2.5, 12, 110),
      new THREE.MeshBasicMaterial({
        color: palette.inner,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ringB.position.copy(position).add(new THREE.Vector3(0, 0, 6));
    ringB.rotation.y = Math.PI / 3;
    ringB.rotation.z = -time * 0.0017 - index;

    return [ringA, ringB, core];
  }

  private clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];

      this.group.remove(child);

      const mesh = child as THREE.Mesh;

      mesh.geometry?.dispose?.();

      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose?.();
      }
    }
  }
}