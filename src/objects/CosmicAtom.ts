import * as THREE from "three";

export class CosmicAtom {
  public readonly group = new THREE.Group();
  public baseScale = 1;
  public initialized = false;
  public sideIndex = 0;

  private outerGlow!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private innerGlow!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private shell!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private nucleus!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private darkCore!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private smokeRing!: THREE.Group;
  private shockwave!: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private galaxyRing!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private aura!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private orbitSystem!: THREE.Group;
  private electrons: THREE.Group[] = [];

  constructor(outerColor: number, innerColor: number, thirdColor: number) {
    this.build(outerColor, innerColor, thirdColor);
  }

  setColors(outerColor: number, innerColor: number, thirdColor: number): void {
    this.outerGlow.material.color.setHex(outerColor);
    this.innerGlow.material.color.setHex(innerColor);
    this.shell.material.color.setHex(outerColor);
    this.nucleus.material.color.setHex(innerColor);
    this.shockwave.material.color.setHex(outerColor);

    this.smokeRing.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial | undefined;

      if (material?.color) {
        material.color.setHex(outerColor);
      }
    });

    this.electrons.forEach((electron, index) => {
      const color = index === 0 ? outerColor : index === 1 ? innerColor : thirdColor;

      electron.traverse((child) => {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshBasicMaterial | undefined;

        if (material?.color) {
          material.color.setHex(color);
        }
      });
    });
  }

  update(time: number): void {
    this.group.scale.setScalar(this.baseScale);

    this.outerGlow.scale.setScalar(1 + Math.sin(time * 0.0028) * 0.05);
    this.innerGlow.scale.setScalar(1 + Math.cos(time * 0.003) * 0.045);

    this.shell.rotation.x += 0.0038;
    this.shell.rotation.y += 0.0068;

    this.nucleus.rotation.y += 0.005;
    this.darkCore.rotation.x -= 0.003;

    this.aura.rotation.x += 0.0015;
    this.aura.rotation.y += 0.0026;

    this.smokeRing.rotation.z += 0.002;
    this.smokeRing.rotation.x += 0.0008;

    this.galaxyRing.rotation.z += 0.0035;
    this.galaxyRing.rotation.y += 0.0009;

    const waveScale =
      1 + ((time * 0.00062 + this.sideIndex * 0.37) % 1) * 0.58;

    this.shockwave.scale.setScalar(waveScale);
    this.shockwave.material.opacity = Math.max(
      0.018,
      0.17 * (1.58 - waveScale)
    );

    this.shockwave.rotation.z += 0.002;

    this.orbitSystem.rotation.z += 0.0008;

    this.electrons[0].rotation.z += 0.025;
    this.electrons[1].rotation.z -= 0.019;
    this.electrons[2].rotation.z += 0.015;
  }

  dispose(): void {
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();

      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose?.();
      }
    });
  }

  private build(outerColor: number, innerColor: number, thirdColor: number): void {
    this.outerGlow = this.sphere(165, outerColor, 0.09);
    this.innerGlow = this.sphere(125, innerColor, 0.085);
    this.shell = this.sphere(105, outerColor, 0.32, true);
    this.nucleus = this.sphere(52, innerColor, 0.46);
    this.darkCore = this.sphere(28, 0x020006, 0.6, false, false);

    this.aura = this.createAura(outerColor, innerColor);
    this.smokeRing = this.createSmokeRing(outerColor);
    this.shockwave = this.createShockwave(outerColor);
    this.galaxyRing = this.createGalaxyRing(outerColor, innerColor);
    this.orbitSystem = this.createOrbitSystem(outerColor, innerColor, thirdColor);

    this.group.add(
      this.outerGlow,
      this.innerGlow,
      this.shockwave,
      this.smokeRing,
      this.galaxyRing,
      this.shell,
      this.nucleus,
      this.darkCore,
      this.aura,
      this.orbitSystem
    );
  }

  private sphere(
    radius: number,
    color: number,
    opacity: number,
    wireframe = false,
    additive = true
  ) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 64),
      new THREE.MeshBasicMaterial({
        color,
        wireframe,
        transparent: true,
        opacity,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false
      })
    );
  }

  private createSmokeRing(color: number): THREE.Group {
    const group = new THREE.Group();

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(112, 14, 24, 160),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ring1.rotation.x = Math.PI / 2.75;

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(100, 10, 20, 140),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.085,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    ring2.rotation.y = Math.PI / 3.1;

    group.add(ring1, ring2);

    return group;
  }

  private createShockwave(color: number) {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(132, 3, 12, 160),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.17,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    wave.rotation.x = Math.PI / 2.4;
    return wave;
  }

  private createGalaxyRing(colorA: number, colorB: number) {
    const count = 750;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 8 + Math.random() * 0.35;
      const radius = 28 + t * 125 + Math.random() * 14;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.62;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      const c = i % 2 === 0 ? a : b;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    points.rotation.x = Math.PI / 7;

    return points;
  }

  private createAura(colorA: number, colorB: number) {
    const count = 1900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const a = new THREE.Color(colorA);
    const b = new THREE.Color(colorB);

    for (let i = 0; i < count; i++) {
      const radius = 65 + Math.random() * 105;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      positions[i * 3 + 2] = Math.cos(phi) * radius;

      const c = Math.random() > 0.35 ? a : b;

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
        size: 2.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.64,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  private createOrbitSystem(
    outer: number,
    inner: number,
    third: number
  ): THREE.Group {
    const group = new THREE.Group();

    const rings = [
      this.orbitRing(118, outer, 0.13),
      this.orbitRing(105, inner, 0.085),
      this.orbitRing(130, third, 0.07)
    ];

    rings[0].rotation.x = Math.PI / 5;
    rings[1].rotation.y = Math.PI / 4.2;
    rings[2].rotation.x = Math.PI / 2.6;
    rings[2].rotation.z = Math.PI / 6;

    group.add(...rings);

    this.electrons = [
      this.electron(outer, 118),
      this.electron(inner, 105),
      this.electron(third, 130)
    ];

    this.electrons[0].rotation.x = Math.PI / 5;
    this.electrons[1].rotation.y = Math.PI / 4.2;
    this.electrons[2].rotation.x = Math.PI / 2.6;
    this.electrons[2].rotation.z = Math.PI / 6;

    group.add(...this.electrons);

    return group;
  }

  private orbitRing(
    radius: number,
    color: number,
    opacity: number
  ): THREE.LineLoop {
    const curve = new THREE.EllipseCurve(
      0,
      0,
      radius,
      radius * 0.72,
      0,
      Math.PI * 2
    );

    const points = curve
      .getPoints(160)
      .map((p) => new THREE.Vector3(p.x, p.y, 0));

    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
  }

  private electron(color: number, radius: number): THREE.Group {
    const pivot = new THREE.Group();

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(6, 20, 20),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(15, 20, 20),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    dot.position.x = radius;
    glow.position.x = radius;

    pivot.add(glow, dot);

    return pivot;
  }
}