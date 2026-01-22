(function () {
  const AidenModel = {
    createAiden,
    updateMouthMesh,
    updateEyebrows,
  };

  window.AidenModel = AidenModel;
})();

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
  mouth.position.set(0, 1.34, 0.92);

  group.add(torso, neck, headMesh, glasses, eyes, eyebrows, mouth);

  return {
    group,
    headMesh,
    mouthMesh: mouth,
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
  const group = new THREE.Group();

  const mouthInteriorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0b0b,
    roughness: 0.9,
    metalness: 0,
  });
  const mouthRadiusX = 0.18 * 1.9;
  const mouthRadiusY = 0.18 * 0.6;
  const mouthDepth = 0.05;
  const mouthShape = new THREE.Shape();
  mouthShape.absellipse(0, 0, mouthRadiusX, mouthRadiusY, 0, Math.PI * 2, false, 0);
  const mouthHole = new THREE.Path();
  mouthHole.absellipse(0, 0, mouthRadiusX * 0.65, mouthRadiusY * 0.45, 0, Math.PI * 2, false, 0);
  mouthShape.holes.push(mouthHole);
  const mouthInteriorGeo = new THREE.ExtrudeGeometry(mouthShape, {
    depth: mouthDepth,
    steps: 1,
    bevelEnabled: false,
  });
  mouthInteriorGeo.translate(0, 0, -mouthDepth / 2);
  const mouthInterior = new THREE.Mesh(mouthInteriorGeo, mouthInteriorMaterial);
  mouthInterior.position.set(0, -0.02, -0.01);
  mouthInterior.castShadow = true;

  group.add(mouthInterior);
  group.userData.interior = mouthInterior;

  return group;
}

function updateMouthMesh(mouth, influences) {
  if (!mouth) return;
  const open = influences.mouthOpen || 0;
  const smile = influences.smile || 0;
  const wide = influences.wide || 0;

  const width = 1 + wide * 0.6;
  const height = 1 + open * 1.0;

  mouth.scale.set(width, height, 1);
  mouth.rotation.z = Math.PI;
  mouth.position.y = 1.34 - open * 0.045 + smile * 0.04;
  mouth.position.z = 0.92 + smile * 0.06 + wide * 0.02;

  const interior = mouth.userData.interior;
  if (interior) {
    const interiorWidth = 0.85 + wide * 0.35;
    const interiorHeight = Math.max(0.2, open * 1.0);
    const smileCurve = 0.35 * smile;
    interior.scale.set(interiorWidth, interiorHeight, 1);
    interior.position.y = -0.02 - open * 0.05 + smile * 0.03;
    interior.rotation.z = 0;

    mouth.updateMatrixWorld(true);
    interior.updateMatrixWorld(true);

    const position = interior.geometry.attributes.position;
    const base = interior.geometry.userData.basePosition;
    if (!base) {
      interior.geometry.userData.basePosition = position.array.slice();
    }
    const basePositions = interior.geometry.userData.basePosition;
    const headCenter = new THREE.Vector3(0, 1.65, 0);
    const wrapRadius = 0.915 + smile * 0.11 + wide * 0.04;
    const worldMatrix = interior.matrixWorld;
    const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert();
    const local = new THREE.Vector3();
    const world = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const frontDir = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < position.count; i += 1) {
      const idx = i * 3;
      const x = basePositions[idx];
      const y = basePositions[idx + 1];
      const z = basePositions[idx + 2];
      const lift = -smileCurve * Math.pow(Math.abs(x) / 0.35, 1.5);
      local.set(x, y + lift, z + smile * 0.02 + wide * 0.01);
      world.copy(local).applyMatrix4(worldMatrix);
      dir.copy(world).sub(headCenter);
      if (dir.lengthSq() > 0.0001) {
        dir.normalize();
        dir.lerp(frontDir, 0.45 + smile * 0.25).normalize();
        world.copy(headCenter).addScaledVector(dir, wrapRadius + z);
        local.copy(world).applyMatrix4(inverseMatrix);
      }
      position.array[idx] = local.x;
      position.array[idx + 1] = local.y;
      position.array[idx + 2] = local.z;
    }
    position.needsUpdate = true;
    interior.geometry.computeVertexNormals();
  }
}
