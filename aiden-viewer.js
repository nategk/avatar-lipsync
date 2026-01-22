const viewport = document.getElementById("viewport");
const scene = new THREE.Scene();

scene.background = createGradientBackground();

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.3, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

camera.lookAt(0, 1.1, 0);

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

if (aidenGroup) {
  scene.add(aidenGroup);
}

const currentExpressions = {
  eyebrowRaise: 0,
  eyebrowTilt: 0,
};

let externalViseme = null;
let externalIntensity = 1.0;
let pendingMouthPose = null;
let pendingBlendshapePose = null;

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
  const title = lower.toUpperCase();
  if (OVR_VISEMES.has(lower)) return lower;
  if (OVR_VISEMES.has(title)) return title;
  return "sil";
}

const visemePoseMap = {
  sil: {
    mouth: { jawOpen: 0, mouthClose: 0.8, mouthFunnel: 0, mouthPucker: 0 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  PP: {
    mouth: { jawOpen: 0, mouthClose: 1, mouthPucker: 0.1 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  FF: {
    mouth: { jawOpen: 0.2, mouthFunnel: 0.1, mouthClose: 0.2 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0 },
  },
  TH: {
    mouth: { jawOpen: 0.45, tongueOut: 0.4, mouthPucker: 0.05 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  DD: {
    mouth: { jawOpen: 0.25, tongueOut: 0.2, mouthClose: 0.1 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  kk: {
    mouth: { jawOpen: 0.25, tongueOut: 0.15, mouthClose: 0.05 },
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
    mouth: { jawOpen: 0.15, tongueOut: 0.1, mouthClose: 0.05 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  RR: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.2 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0.01 },
  },
  aa: {
    mouth: { jawOpen: 0.7, mouthFunnel: 0.05 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.02 },
  },
  E: {
    mouth: { jawOpen: 0.3, mouthSmileLeft: 0.35, mouthSmileRight: 0.35 },
    brows: { eyebrowRaise: 0.12, eyebrowTilt: 0.02 },
  },
  I: {
    mouth: { jawOpen: 0.2, mouthSmileLeft: 0.25, mouthSmileRight: 0.25 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  O: {
    mouth: { jawOpen: 0.35, mouthPucker: 0.5, mouthFunnel: 0.3 },
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
    mouthDimpleLeft: (mouth.mouthDimpleLeft || 0) * amt,
    mouthDimpleRight: (mouth.mouthDimpleRight || 0) * amt,
    mouthRollLower: (mouth.mouthRollLower || 0) * amt,
    mouthRollUpper: (mouth.mouthRollUpper || 0) * amt,
    mouthShrugLower: (mouth.mouthShrugLower || 0) * amt,
    mouthShrugUpper: (mouth.mouthShrugUpper || 0) * amt,
    tongueOut: (mouth.tongueOut || 0) * amt,
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

function animate() {
  requestAnimationFrame(animate);

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
    applyVisemePose("sil", 0);
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
