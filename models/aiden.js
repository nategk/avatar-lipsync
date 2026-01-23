import * as THREE from "three";

const AidenModel = {
  createAiden,
  updateEyebrows,
};

window.AidenModel = AidenModel;

function createAiden() {
  const group = new THREE.Group();

  const headGeometry = buildHeadGeometry();
  const aidenMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f1eb,
    roughness: 0.95,
    metalness: 0,
  });
  const headMesh = new THREE.Mesh(headGeometry, aidenMaterial);
  headMesh.position.set(0, 1.65, 0);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headMesh.updateMorphTargets();

  const torsoMaterial = new THREE.MeshStandardMaterial({
    color: 0xb98355,
    roughness: 0.85,
    metalness: 0.05,
  });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 1.3, 48), torsoMaterial);
  torso.position.set(0, 0.1, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.42, 0.35, 32),
    aidenMaterial
  );
  neck.position.set(0, 0.93, 0);
  neck.castShadow = true;

  const glasses = createGlasses();
  glasses.position.set(0, 1.75, 0.92);

  const eyes = createEyes();
  eyes.position.set(0, 1.73, 0.9);

  const eyebrows = createEyebrows();
  eyebrows.position.set(0, 1.98, 0.86);

  const mouth = createMouth();
  mouth.position.set(0, 1.34, 0.93);

  group.add(torso, neck, headMesh, glasses, eyes, eyebrows, mouth);

  return {
    group,
    headMesh,
    parts: {
      head: headMesh,
      torso,
      neck,
      glasses,
      eyes,
      eyebrows,
      mouth,
    },
  };
}

function buildHeadGeometry() {
  const geometry = new THREE.SphereGeometry(0.92, 64, 64);
  const position = geometry.attributes.position;
  const count = position.count;

  for (let i = 0; i < count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    const noise =
      (Math.sin(x * 11.3 + y * 7.7 + z * 5.1) +
        Math.cos(x * 17.7 - y * 9.2 + z * 3.3)) *
      0.007;
    const nx = x + x * noise;
    const ny = y + y * noise;
    const nz = z + z * noise;
    position.setXYZ(i, nx, ny, nz);

  }
  geometry.computeVertexNormals();

  return geometry;
}

function createGlasses() {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a4b2f,
    roughness: 0.4,
    metalness: 0.1,
  });

  const ringGeo = new THREE.TorusGeometry(0.24, 0.012, 20, 64);
  const leftRing = new THREE.Mesh(ringGeo, frameMaterial);
  leftRing.position.set(-0.3, 0, 0);
  const rightRing = new THREE.Mesh(ringGeo, frameMaterial);
  rightRing.position.set(0.3, 0, 0);

  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), frameMaterial);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0, 0);

  group.add(leftRing, rightRing, bridge);
  return group;
}

function createEyes() {
  const group = new THREE.Group();
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.5,
    metalness: 0,
  });
  const eyeGeo = new THREE.SphereGeometry(0.045, 24, 24);

  const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  leftEye.position.set(-0.22, 0, 0);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  rightEye.position.set(0.22, 0, 0);

  group.add(leftEye, rightEye);
  return group;
}

function createEyebrows() {
  const group = new THREE.Group();
  const browMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2f26,
    roughness: 0.65,
    metalness: 0,
  });

  const browArc = Math.PI * 0.8;
  const browTilt = Math.PI * -0.08;
  const browGeo = new THREE.TorusGeometry(0.16, 0.018, 12, 48, browArc);
  const leftBrow = new THREE.Mesh(browGeo, browMaterial);
  leftBrow.rotation.z = Math.PI + browTilt;
  leftBrow.scale.y = -1;
  leftBrow.position.set(-0.24, 0, 0);

  const rightBrow = new THREE.Mesh(browGeo, browMaterial);
  rightBrow.rotation.z = Math.PI - browTilt;
  rightBrow.scale.set(-1, -1, 1);
  rightBrow.position.set(0.24, 0, 0);

  group.add(leftBrow, rightBrow);
  group.userData.left = leftBrow;
  group.userData.right = rightBrow;
  group.userData.base = {
    leftPos: leftBrow.position.clone(),
    rightPos: rightBrow.position.clone(),
    leftRotZ: leftBrow.rotation.z,
    rightRotZ: rightBrow.rotation.z,
  };
  return group;
}

function updateEyebrows(eyebrows, influences) {
  if (!eyebrows || !eyebrows.userData?.base) return;
  const raise = influences.eyebrowRaise || 0;
  const tilt = influences.eyebrowTilt || 0;
  const base = eyebrows.userData.base;
  const left = eyebrows.userData.left;
  const right = eyebrows.userData.right;
  if (!left || !right) return;

  left.position.y = base.leftPos.y + raise * 0.08;
  right.position.y = base.rightPos.y + raise * 0.08;
  left.rotation.z = base.leftRotZ + tilt;
  right.rotation.z = base.rightRotZ - tilt;
}

function createMouth() {
  const width = 0.52;
  const height = 0.22;
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, width / 2, height / 2, 0, Math.PI * 2, false, 0);
  const geometry = new THREE.ShapeGeometry(shape, 32);
  const position = geometry.attributes.position;
  const base = position.array.slice();
  const halfW = width / 2;
  const halfH = height / 2;

  const morphs = [];
  const morphNames = [];

  const addMorph = (name, transform) => {
    const next = base.slice();
    for (let i = 0; i < next.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const z = base[i + 2];
      const vec = transform(x, y, z);
      next[i] = vec.x;
      next[i + 1] = vec.y;
      next[i + 2] = vec.z;
    }
    const attr = new THREE.Float32BufferAttribute(next, 3);
    attr.name = name;
    morphs.push(attr);
    morphNames.push(name);
  };

  const edgeFalloff = (x, y) => {
    const nx = 1 - Math.min(1, Math.abs(x) / halfW);
    const ny = 1 - Math.min(1, Math.abs(y) / halfH);
    return Math.max(0, nx * ny);
  };

  addMorph("jawOpen", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const lower = y < 0 ? 1 : 0.25;
    return { x, y: y - 0.28 * weight * lower, z: z + 0.03 * weight };
  });

  addMorph("mouthClose", (x, y, z) => ({
    x,
    y: y * 0.1,
    z: z - 0.03 * edgeFalloff(x, y),
  }));

  addMorph("mouthFunnel", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    return { x: x * (1 - 0.82 * weight), y: y * 0.82, z: z + 0.12 * weight };
  });

  addMorph("mouthPucker", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    return { x: x * (1 - 0.5 * weight), y: y * 0.75, z: z + 0.12 * weight };
  });

  addMorph("mouthSmileLeft", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const lift = x < 0 ? 0.11 * weight : 0;
    return { x, y: y + lift, z };
  });

  addMorph("mouthSmileRight", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const lift = x > 0 ? 0.11 * weight : 0;
    return { x, y: y + lift, z };
  });

  addMorph("mouthFrownLeft", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const drop = x < 0 ? 0.18 * weight : 0;
    return { x, y: y - drop, z };
  });

  addMorph("mouthFrownRight", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const drop = x > 0 ? 0.18 * weight : 0;
    return { x, y: y - drop, z };
  });

  addMorph("mouthStretchLeft", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const stretch = x < 0 ? -0.18 * weight : 0;
    return { x: x + stretch, y, z };
  });

  addMorph("mouthStretchRight", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const stretch = x > 0 ? 0.18 * weight : 0;
    return { x: x + stretch, y, z };
  });

  addMorph("mouthPressLeft", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const press = x < 0 ? 0.3 : 1;
    return { x, y: y * press, z: z - 0.03 * weight };
  });

  addMorph("mouthPressRight", (x, y, z) => {
    const weight = edgeFalloff(x, y);
    const press = x > 0 ? 0.3 : 1;
    return { x, y: y * press, z: z - 0.03 * weight };
  });

  geometry.morphAttributes.position = morphs;

  const material = new THREE.MeshStandardMaterial({
    color: 0x1c1410,
    roughness: 0.7,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.updateMorphTargets();
  mesh.userData.morphTargetNames = morphNames;

  return mesh;
}
