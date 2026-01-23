const viewport = document.getElementById("viewport");
const scene = new THREE.Scene();

scene.background = createGradientBackground();

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const defaultCameraPosition = new THREE.Vector3(0, 1.3, 5.2);
camera.position.copy(defaultCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(0, 1.1, 0);
const spherical = new THREE.Spherical();
const minRadius = 2.2;
const maxRadius = 10;

renderer.domElement.style.touchAction = "none";
updateSphericalFromCamera();
updateCameraFromSpherical();

scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(4, 6, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
fillLight.position.set(-4, 2, 3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
rimLight.position.set(-2, 3, -5);
scene.add(rimLight);

const model = window.AidenModel?.createAiden?.();
if (!model) {
  console.error("AidenModel not found. Load aiden.js before aiden-viewer.js.");
}

const aidenGroup = model?.group;
const eyebrows = model?.parts?.eyebrows;
const mouthMesh = model?.parts?.mouth;

if (aidenGroup) {
  scene.add(aidenGroup);
}

const currentExpressions = {
  eyebrowRaise: 0,
  eyebrowTilt: 0,
};

const mouthSmoothing = 0.18;

let externalViseme = null;
let externalIntensity = 1.0;
let pendingMouthPose = null;
let pendingBlendshapePose = null;

const visemeSelect = document.getElementById("viseme");
const intensitySlider = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");

const OVR_VISEMES = new Set([
  "sil",
  "PP",
  "FF",
  "TH",
  "DD",
  "kk",
  "CH",
  "SS",
  "nn",
  "RR",
  "aa",
  "E",
  "I",
  "O",
  "U",
]);

const ARKIT_BLENDSHAPE_KEYS = new Set([
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "noseSneerLeft",
  "noseSneerRight",
  "tongueOut",
]);

function normalizeViseme(viseme) {
  if (!viseme) return "sil";
  const raw = String(viseme).trim();
  const stripped = raw.startsWith("viseme_") ? raw.slice(7) : raw;
  if (OVR_VISEMES.has(stripped)) return stripped;
  const lower = stripped.toLowerCase();
  const upper = stripped.toUpperCase();
  if (OVR_VISEMES.has(lower)) return lower;
  if (OVR_VISEMES.has(upper)) return upper;

  const aliasMap = {
    aa: "aa",
    ah: "aa",
    ae: "aa",
    ee: "E",
    eh: "E",
    ih: "I",
    ix: "I",
    iy: "I",
    oo: "O",
    oh: "O",
    ow: "O",
    ao: "O",
    uu: "U",
    uh: "U",
    uw: "U",
    mm: "PP",
    bb: "PP",
    pp: "PP",
    ff: "FF",
    vv: "FF",
    th: "TH",
    dh: "TH",
    dd: "DD",
    tt: "DD",
    nd: "DD",
    kk: "kk",
    gg: "kk",
    ch: "CH",
    jh: "CH",
    sh: "CH",
    zh: "CH",
    ss: "SS",
    zz: "SS",
    nn: "nn",
    ng: "nn",
    rr: "RR",
    er: "RR",
    sil: "sil",
    sp: "sil",
    pause: "sil",
  };
  if (aliasMap[lower]) return aliasMap[lower];
  if (aliasMap[upper]) return aliasMap[upper];

  return "sil";
}

const visemePoseMap = {
  sil: {
    mouth: { jawOpen: 0, mouthClose: 0.8, mouthFunnel: 0, mouthPucker: 0 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  PP: {
    mouth: { jawOpen: 0, mouthClose: 1, mouthPucker: 0.4, mouthPressLeft: 0.35, mouthPressRight: 0.35 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  FF: {
    mouth: { jawOpen: 0.05, mouthClose: 0.9, mouthPucker: 0.25, mouthPressLeft: 0.4, mouthPressRight: 0.4 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0 },
  },
  TH: {
    mouth: { jawOpen: 0.45, mouthPucker: 0.05 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  DD: {
    mouth: { jawOpen: 0.25, mouthClose: 0.1 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  kk: {
    mouth: { jawOpen: 0.25, mouthClose: 0.05 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  CH: {
    mouth: { jawOpen: 0.4, mouthFunnel: 0.2, mouthPucker: 0.15 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.01 },
  },
  SS: {
    mouth: { jawOpen: 0.2, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 },
    brows: { eyebrowRaise: 0.09, eyebrowTilt: 0.02 },
  },
  nn: {
    mouth: { jawOpen: 0.15, mouthClose: 0.05 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  RR: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.2 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0.01 },
  },
  aa: {
    mouth: { jawOpen: 0.95, mouthFunnel: 0.1 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.02 },
  },
  E: {
    mouth: {
      jawOpen: 0.15,
      mouthClose: 0.3,
      mouthSmileLeft: 0.15,
      mouthSmileRight: 0.15,
      mouthStretchLeft: 0.55,
      mouthStretchRight: 0.55,
    },
    brows: { eyebrowRaise: 0.02, eyebrowTilt: 0.08 },
  },
  I: {
    mouth: { jawOpen: 0.2, mouthSmileLeft: 0.25, mouthSmileRight: 0.25 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  O: {
    mouth: { jawOpen: 0.45, mouthPucker: 0.9, mouthFunnel: 0.75 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: -0.01 },
  },
  U: {
    mouth: { jawOpen: 0.25, mouthPucker: 0.6, mouthFunnel: 0.25 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: -0.01 },
  },
};

function applyVisemePose(viseme, intensity) {
  const normalized = normalizeViseme(viseme);
  const pose = visemePoseMap[normalized] || visemePoseMap.sil;
  const mouth = pose.mouth || visemePoseMap.sil.mouth;
  const brows = pose.brows || visemePoseMap.sil.brows;
  const amt = Math.max(0, Math.min(1, intensity));

  pendingMouthPose = {
    jawOpen: (mouth.jawOpen || 0) * amt,
    mouthClose: (mouth.mouthClose || 0) * amt,
    mouthFunnel: (mouth.mouthFunnel || 0) * amt,
    mouthPucker: (mouth.mouthPucker || 0) * amt,
    mouthSmileLeft: (mouth.mouthSmileLeft || 0) * amt,
    mouthSmileRight: (mouth.mouthSmileRight || 0) * amt,
    mouthFrownLeft: (mouth.mouthFrownLeft || 0) * amt,
    mouthFrownRight: (mouth.mouthFrownRight || 0) * amt,
    mouthPressLeft: (mouth.mouthPressLeft || 0) * amt,
    mouthPressRight: (mouth.mouthPressRight || 0) * amt,
    mouthStretchLeft: (mouth.mouthStretchLeft || 0) * amt,
    mouthStretchRight: (mouth.mouthStretchRight || 0) * amt,
  };

  currentExpressions.eyebrowRaise = brows.eyebrowRaise * amt;
  currentExpressions.eyebrowTilt = brows.eyebrowTilt * amt;

  // TODO: Hook pendingMouthPose into the next mouth rig implementation.
}

function applyBlendshapePose(blendshapes, intensity = 1) {
  if (!blendshapes || typeof blendshapes !== "object") {
    pendingBlendshapePose = null;
    return;
  }
  const amt = Math.max(0, Math.min(1, intensity));
  const nextPose = {};

  Object.entries(blendshapes).forEach(([key, value]) => {
    if (!ARKIT_BLENDSHAPE_KEYS.has(key)) return;
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) return;
    nextPose[key] = Math.max(0, Math.min(1, numeric)) * amt;
  });

  pendingBlendshapePose = nextPose;
  // TODO: Hook pendingBlendshapePose into the next mouth/face rig implementation.
}

function getMouthTargetValue(name) {
  if (pendingBlendshapePose && name in pendingBlendshapePose) {
    return pendingBlendshapePose[name];
  }
  if (pendingMouthPose && name in pendingMouthPose) {
    return pendingMouthPose[name];
  }
  return 0;
}

function updateMouthRig() {
  if (!mouthMesh?.morphTargetDictionary || !mouthMesh.morphTargetInfluences) return;
  const dict = mouthMesh.morphTargetDictionary;
  const influences = mouthMesh.morphTargetInfluences;
  Object.keys(dict).forEach((name) => {
    const target = getMouthTargetValue(name);
    const idx = dict[name];
    const current = influences[idx] || 0;
    influences[idx] = THREE.MathUtils.lerp(current, target, mouthSmoothing);
  });
}

applyVisemePose("sil", 1);

if (visemeSelect) {
  visemeSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    applyVisemePose(value, externalIntensity);
  });
}

if (intensitySlider) {
  intensitySlider.addEventListener("input", (event) => {
    const next = Number(event.target.value);
    externalIntensity = Math.max(0, Math.min(1, next));
    if (intensityValue) {
      intensityValue.textContent = externalIntensity.toFixed(2);
    }
    const current = visemeSelect?.value || externalViseme || "sil";
    applyVisemePose(current, externalIntensity);
  });
}

function animate() {
  requestAnimationFrame(animate);

  updateMouthRig();
  window.AidenModel?.updateEyebrows?.(eyebrows, currentExpressions);
  if (aidenGroup) {
    aidenGroup.rotation.y = Math.sin(Date.now() * 0.0005) * 0.08;
  }
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateCameraFromSpherical();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.aidenVisemeDriver = {
  setViseme(viseme, amount = 1) {
    externalViseme = normalizeViseme(viseme);
    externalIntensity = Math.max(0, Math.min(1, amount));
    applyVisemePose(externalViseme, externalIntensity);
  },
  clearViseme() {
    externalViseme = null;
    applyVisemePose("sil", 1);
  },
  setBlendshapes(blendshapes, amount = 1) {
    applyBlendshapePose(blendshapes, amount);
  },
};

window.aidenRigDebug = {
  getPendingMouthPose() {
    return pendingMouthPose ? { ...pendingMouthPose } : null;
  },
  getPendingBlendshapePose() {
    return pendingBlendshapePose ? { ...pendingBlendshapePose } : null;
  },
};

function createGradientBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#1b1d25");
  gradient.addColorStop(1, "#101219");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

let isDragging = false;
let isPanning = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener("pointerdown", (event) => {
  isDragging = true;
  isPanning = event.button === 2 || event.shiftKey;
  lastX = event.clientX;
  lastY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const deltaX = event.clientX - lastX;
  const deltaY = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;

  if (isPanning) {
    const panSpeed = 0.0025 * spherical.radius;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
    const up = new THREE.Vector3(0, 1, 0);
    orbitTarget.addScaledVector(right, -deltaX * panSpeed);
    orbitTarget.addScaledVector(up, deltaY * panSpeed);
    updateCameraFromSpherical();
    return;
  }

  const rotateSpeed = 0.005;
  spherical.theta -= deltaX * rotateSpeed;
  spherical.phi -= deltaY * rotateSpeed;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.2, Math.PI - 0.2);
  updateCameraFromSpherical();
});

renderer.domElement.addEventListener("pointerup", (event) => {
  isDragging = false;
  isPanning = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});

renderer.domElement.addEventListener("pointerleave", () => {
  isDragging = false;
  isPanning = false;
});

renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const zoomSpeed = 0.002;
    spherical.radius *= 1 + event.deltaY * zoomSpeed;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, minRadius, maxRadius);
    updateCameraFromSpherical();
  },
  { passive: false }
);

renderer.domElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

function updateSphericalFromCamera() {
  const offset = camera.position.clone().sub(orbitTarget);
  spherical.setFromVector3(offset);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, minRadius, maxRadius);
}

function updateCameraFromSpherical() {
  const offset = new THREE.Vector3().setFromSpherical(spherical);
  camera.position.copy(orbitTarget).add(offset);
  camera.lookAt(orbitTarget);
}
