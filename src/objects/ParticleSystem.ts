import * as THREE from "three";

export class ParticleSystem {
  public readonly group = new THREE.Group();

  private readonly bursts: THREE.Group[] = [];

  createStarField(count = 1600): THREE.Points {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const green = new THREE.Color(0x00ff8c);
    const red = new THREE.Color(0xff003c);
    const white = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6500;
      positions[i * 3 + 2] = -900 - Math.random() * 1200;

      const roll = Math.random();
      const color = roll < 0.42 ? green : roll < 0.78 ? red : white;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    this.group.add(stars);

    return stars;
  }

  createBurst(x: number, y: number, z: number, colors: number[]): void {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(24, 3, 10, 90),
      new THREE.MeshBasicMaterial({
        color: colors[0] ?? 0x00ff8c,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ring.rotation.x = Math.PI / 2;

    const count = 160;
    const positions = new Float32Array(count * 3);
    const colorAttr = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.8;

      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * 2
        )
      );

      const color = new THREE.Color(colors[i % colors.length] ?? 0xffffff);

      colorAttr[i * 3] = color.r;
      colorAttr[i * 3 + 1] = color.g;
      colorAttr[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 4.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    group.add(ring, points);

    group.userData = {
      age: 0,
      maxAge: 70,
      ring,
      points,
      velocities
    };

    this.bursts.push(group);
    this.group.add(group);
  }

  update(): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];

      burst.userData.age += 1;

      const age = burst.userData.age as number;
      const maxAge = burst.userData.maxAge as number;
      const life = age / maxAge;

      const ring = burst.userData.ring as THREE.Mesh<
        THREE.TorusGeometry,
        THREE.MeshBasicMaterial
      >;

      const points = burst.userData.points as THREE.Points<
        THREE.BufferGeometry,
        THREE.PointsMaterial
      >;

      const velocities = burst.userData.velocities as THREE.Vector3[];

      ring.scale.setScalar(1 + life * 6);
      ring.material.opacity = Math.max(0, 0.72 * (1 - life));

      const positionAttribute = points.geometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;

      const positions = positionAttribute.array as Float32Array;

      for (let j = 0; j < velocities.length; j++) {
        positions[j * 3] += velocities[j].x;
        positions[j * 3 + 1] += velocities[j].y;
        positions[j * 3 + 2] += velocities[j].z;
      }

      positionAttribute.needsUpdate = true;
      points.material.opacity = Math.max(0, 0.95 * (1 - life));

      if (age >= maxAge) {
        this.group.remove(burst);
        this.disposeObject(burst);
        this.bursts.splice(i, 1);
      }
    }

    this.group.rotation.z += 0.00004;
  }

  dispose(): void {
    this.disposeObject(this.group);
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      mesh.geometry?.dispose?.();

      const material = mesh.material as
        | THREE.Material
        | THREE.Material[]
        | undefined;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose?.();
      }
    });
  }
}