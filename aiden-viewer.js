import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "./vendor/meshopt_decoder.module.js";

const viewport = document.getElementById("viewport");
const scene = new THREE.Scene();

scene.background = createGradientBackground();

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const defaultCameraPosition = new THREE.Vector3(-0.6, 1.45, 5.2);
camera.position.copy(defaultCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(-0.6, 1.25, 0);
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

const params = new URLSearchParams(window.location.search);
const storedModel = window.localStorage?.getItem("selectedModel") || "aiden";
const selectedModel = params.get("model") || storedModel;
const useFaceModel = selectedModel === "facecap";
const model = window.AidenModel?.createAiden?.();
if (!model) {
  console.error("AidenModel not found. Load aiden.js before aiden-viewer.js.");
}

const aidenGroup = model?.group;
const eyebrows = model?.parts?.eyebrows;
const mouthMesh = model?.parts?.mouth;
let morphTargetMeshes = [];
let faceObject = null;
let currentModelMode = selectedModel;

const addAidenModel = () => {
  if (aidenGroup && aidenGroup.parent !== scene) {
    scene.add(aidenGroup);
  }
  morphTargetMeshes = [];
  if (mouthMesh) {
    morphTargetMeshes.push(mouthMesh);
    updateAidenMorphTargets();
  }
};

const removeAidenModel = () => {
  if (aidenGroup && aidenGroup.parent === scene) {
    scene.remove(aidenGroup);
  }
};

const clearFaceModel = () => {
  if (faceObject) {
    scene.remove(faceObject);
    faceObject = null;
  }
  morphTargetMeshes = [];
};

const currentExpressions = {
  eyebrowRaise: 0,
  eyebrowTilt: 0,
};

const mouthSmoothing = 0.32;

let externalViseme = null;
let externalIntensity = 1.0;
let pendingMouthPose = null;
let pendingBlendshapePose = null;

const visemeSelect = document.getElementById("viseme");
const intensitySlider = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");
const modelSelect = document.getElementById("modelSelect");
const morphTargetsList = document.getElementById("morphTargetsList");
const MODEL_INFO = {
  aiden: { displayName: "Aiden (cartoon)" },
  facecap: { displayName: "FaceCap (morph targets)" },
};
const FACE_CAP_TARGET_NAMES = [
  "browInnerUp",
  "browDown_L",
  "browDown_R",
  "browOuterUp_L",
  "browOuterUp_R",
  "eyeLookUp_L",
  "eyeLookUp_R",
  "eyeLookDown_L",
  "eyeLookDown_R",
  "eyeLookIn_L",
  "eyeLookIn_R",
  "eyeLookOut_L",
  "eyeLookOut_R",
  "eyeBlink_L",
  "eyeBlink_R",
  "eyeSquint_L",
  "eyeSquint_R",
  "eyeWide_L",
  "eyeWide_R",
  "cheekPuff",
  "cheekSquint_L",
  "cheekSquint_R",
  "noseSneer_L",
  "noseSneer_R",
  "jawOpen",
  "jawForward",
  "jawLeft",
  "jawRight",
  "mouthFunnel",
  "mouthPucker",
  "mouthLeft",
  "mouthRight",
  "mouthRollUpper",
  "mouthRollLower",
  "mouthShrugUpper",
  "mouthShrugLower",
  "mouthClose",
  "mouthSmile_L",
  "mouthSmile_R",
  "mouthFrown_L",
  "mouthFrown_R",
  "mouthDimple_L",
  "mouthDimple_R",
  "mouthUpperUp_L",
  "mouthUpperUp_R",
  "mouthLowerDown_L",
  "mouthLowerDown_R",
  "mouthPress_L",
  "mouthPress_R",
  "mouthStretch_L",
  "mouthStretch_R",
  "tongueOut",
];

const FACE_CAP_CANONICAL = {
  mouthSmile_L: "mouthSmileLeft",
  mouthSmile_R: "mouthSmileRight",
  mouthFrown_L: "mouthFrownLeft",
  mouthFrown_R: "mouthFrownRight",
  mouthStretch_L: "mouthStretchLeft",
  mouthStretch_R: "mouthStretchRight",
  mouthPress_L: "mouthPressLeft",
  mouthPress_R: "mouthPressRight",
  mouthRollUpper: "mouthRollUpper",
  mouthRollLower: "mouthRollLower",
  mouthShrugUpper: "mouthShrugUpper",
  mouthShrugLower: "mouthShrugLower",
  mouthUpperUp_L: "mouthUpperUpLeft",
  mouthUpperUp_R: "mouthUpperUpRight",
  mouthLowerDown_L: "mouthLowerDownLeft",
  mouthLowerDown_R: "mouthLowerDownRight",
  mouthDimple_L: "mouthDimpleLeft",
  mouthDimple_R: "mouthDimpleRight",
  mouthLeft: "mouthPucker",
  mouthRight: "mouthPucker",
};

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
  AA: {
    mouth: { jawOpen: 0.98, mouthFunnel: 0.1, mouthPucker: 0.05 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.02 },
  },
  EE: {
    mouth: {
      jawOpen: 0.25,
      mouthClose: 0.15,
      mouthStretchLeft: 0.6,
      mouthStretchRight: 0.6,
      mouthSmileLeft: 0.25,
      mouthSmileRight: 0.25,
    },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  OO: {
    mouth: { jawOpen: 0.6, mouthPucker: 0.9, mouthFunnel: 0.75 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: -0.02 },
  },
  MM: {
    mouth: { jawOpen: 0, mouthClose: 1, mouthPressLeft: 0.4, mouthPressRight: 0.4 },
    brows: { eyebrowRaise: 0.04, eyebrowTilt: 0 },
  },
  FF: {
    mouth: {
      jawOpen: 0.05,
      mouthClose: 0.88,
      mouthPucker: 0.35,
      mouthPressLeft: 0.45,
      mouthPressRight: 0.45,
    },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0.02 },
  },
  TH: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.1, mouthFunnel: 0.1 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.05 },
  },
  DD: {
    mouth: { jawOpen: 0.4, mouthClose: 0.15 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0 },
  },
  kk: {
    mouth: { jawOpen: 0.35, mouthClose: 0.15 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0.01 },
  },
  CH: {
    mouth: { jawOpen: 0.45, mouthFunnel: 0.25, mouthPucker: 0.15 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.01 },
  },
  SS: {
    mouth: { jawOpen: 0.18, mouthStretchLeft: 0.34, mouthStretchRight: 0.34 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0.01 },
  },
  nn: {
    mouth: { jawOpen: 0.2, mouthClose: 0.1 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: 0 },
  },
  RR: {
    mouth: { jawOpen: 0.35, mouthPucker: 0.2 },
    brows: { eyebrowRaise: 0.06, eyebrowTilt: 0.01 },
  },
  aa: {
    mouth: { jawOpen: 0.95, mouthFunnel: 0.1 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.02 },
  },
  E: {
    mouth: {
      jawOpen: 0.2,
      mouthClose: 0.25,
      mouthSmileLeft: 0.2,
      mouthSmileRight: 0.2,
      mouthStretchLeft: 0.5,
      mouthStretchRight: 0.5,
    },
    brows: { eyebrowRaise: 0.07, eyebrowTilt: 0.05 },
  },
  I: {
    mouth: {
      jawOpen: 0.18,
      mouthSmileLeft: 0.28,
      mouthSmileRight: 0.28,
    },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  },
  O: {
    mouth: { jawOpen: 0.5, mouthPucker: 0.85, mouthFunnel: 0.7 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: -0.01 },
  },
  U: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.6, mouthFunnel: 0.3 },
    brows: { eyebrowRaise: 0.04, eyebrowTilt: -0.01 },
  },
  sil: {
    mouth: { jawOpen: 0, mouthClose: 0.2 },
    brows: { eyebrowRaise: 0.02, eyebrowTilt: 0 },
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
  const combined = {
    ...(pendingMouthPose || {}),
    ...(pendingBlendshapePose || {}),
  };
  return combined[name] || 0;
}

function applyMouthConstraints(targets) {
  const jawOpen = targets.jawOpen || 0;
  const mouthClose = targets.mouthClose || 0;
  const mouthFunnel = targets.mouthFunnel || 0;
  const mouthPucker = targets.mouthPucker || 0;
  const stretch = Math.max(targets.mouthStretchLeft || 0, targets.mouthStretchRight || 0);
  const smile = Math.max(targets.mouthSmileLeft || 0, targets.mouthSmileRight || 0);
  const frown = Math.max(targets.mouthFrownLeft || 0, targets.mouthFrownRight || 0);

  if (mouthClose > 0.6) {
    targets.jawOpen = jawOpen * (1 - mouthClose);
    targets.mouthFunnel = mouthFunnel * (1 - mouthClose);
    targets.mouthPucker = mouthPucker * (1 - mouthClose * 0.6);
  }

  if (mouthPucker > 0.4 || mouthFunnel > 0.4) {
    const suppress = Math.max(mouthPucker, mouthFunnel);
    targets.mouthStretchLeft = (targets.mouthStretchLeft || 0) * (1 - suppress);
    targets.mouthStretchRight = (targets.mouthStretchRight || 0) * (1 - suppress);
  }

  if (smile > 0 && frown > 0) {
    if (smile >= frown) {
      targets.mouthFrownLeft = (targets.mouthFrownLeft || 0) * (1 - smile);
      targets.mouthFrownRight = (targets.mouthFrownRight || 0) * (1 - smile);
    } else {
      targets.mouthSmileLeft = (targets.mouthSmileLeft || 0) * (1 - frown);
      targets.mouthSmileRight = (targets.mouthSmileRight || 0) * (1 - frown);
    }
  }

  if (stretch > 0.4) {
    targets.mouthPucker = (targets.mouthPucker || 0) * (1 - stretch);
    targets.mouthFunnel = (targets.mouthFunnel || 0) * (1 - stretch);
  }

  return targets;
}

function resolveMorphTargetValue(name, targets) {
  const canonical = FACE_CAP_CANONICAL[name] || FACE_CAP_CANONICAL[name.toLowerCase()] || name;
  name = canonical;
  if (name in targets) return targets[name] || 0;
  const lower = name.toLowerCase();
  if (lower.includes("jawopen")) return targets.jawOpen || 0;
  if (lower.includes("mouthopen")) return targets.jawOpen || 0;
  if (lower.includes("mouthclose")) return targets.mouthClose || 0;
  if (lower.includes("funnel")) return targets.mouthFunnel || 0;
  if (lower.includes("pucker") || lower.includes("kiss")) return targets.mouthPucker || 0;
  if (lower.includes("smile")) {
    const side = lower.includes("l") ? "left" : lower.includes("r") ? "right" : null;
    if (side === "left") return targets.mouthSmileLeft || 0;
    if (side === "right") return targets.mouthSmileRight || 0;
    return Math.max(targets.mouthSmileLeft || 0, targets.mouthSmileRight || 0);
  }
  if (lower.includes("frown") || lower.includes("sad")) {
    const side = lower.includes("l") ? "left" : lower.includes("r") ? "right" : null;
    if (side === "left") return targets.mouthFrownLeft || 0;
    if (side === "right") return targets.mouthFrownRight || 0;
    return Math.max(targets.mouthFrownLeft || 0, targets.mouthFrownRight || 0);
  }
  if (lower.includes("stretch") || lower.includes("wide")) {
    const side = lower.includes("l") ? "left" : lower.includes("r") ? "right" : null;
    if (side === "left") return targets.mouthStretchLeft || 0;
    if (side === "right") return targets.mouthStretchRight || 0;
    return Math.max(targets.mouthStretchLeft || 0, targets.mouthStretchRight || 0);
  }
  if (lower.includes("press")) {
    const side = lower.includes("l") ? "left" : lower.includes("r") ? "right" : null;
    if (side === "left") return targets.mouthPressLeft || 0;
    if (side === "right") return targets.mouthPressRight || 0;
    return Math.max(targets.mouthPressLeft || 0, targets.mouthPressRight || 0);
  }
  if (lower.includes("mouthroll")) {
    return lower.includes("upper") ? (targets.mouthRollUpper || 0) : (targets.mouthRollLower || 0);
  }
  if (lower.includes("mouthshrug")) {
    return lower.includes("upper") ? (targets.mouthShrugUpper || 0) : (targets.mouthShrugLower || 0);
  }
  if (lower.includes("mouthlift")) {
    return targets.mouthUpperUpLeft || targets.mouthUpperUpRight || 0;
  }
  return 0;
}

function updateMouthRig() {
  if (!morphTargetMeshes.length) return;
  const baseTargets = applyMouthConstraints({
    ...(pendingMouthPose || {}),
    ...(pendingBlendshapePose || {}),
  });
  morphTargetMeshes.forEach((mesh) => {
    if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    Object.keys(dict).forEach((name) => {
      const target = resolveMorphTargetValue(name, baseTargets);
      const idx = dict[name];
      const current = influences[idx] || 0;
      influences[idx] = THREE.MathUtils.lerp(current, target, mouthSmoothing);
    });
  });
}

applyVisemePose("sil", 1);

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/")
  .detectSupport(renderer);
const loader = new GLTFLoader().setKTX2Loader(ktx2Loader);
const meshoptSetup = () => {
  if (typeof loader.setMeshoptDecoder === "function") {
    loader.setMeshoptDecoder(MeshoptDecoder);
  } else if (typeof GLTFLoader.setMeshoptDecoder === "function") {
    GLTFLoader.setMeshoptDecoder(MeshoptDecoder);
  } else {
    console.warn("GLTFLoader.setMeshoptDecoder not available; meshopt data may not load.");
  }
};
const meshoptReady =
  MeshoptDecoder?.ready?.then?.(() => {
    meshoptSetup();
  }) ||
  Promise.resolve().then(() => {
    meshoptSetup();
  });
const faceUrls = [
  "./models/facecap.glb",
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/facecap.glb",
  "https://threejs.org/examples/models/gltf/facecap.glb",
];

const setMorphListText = (text) => {
  if (morphTargetsList) morphTargetsList.textContent = text;
};

function getModelDisplayName(key) {
  return MODEL_INFO[key]?.displayName || "Model";
}

function showMorphTargetsList(names, fallback, modelKey = currentModelMode) {
  if (!morphTargetsList) return;
  if (Array.isArray(names) && names.length) {
    morphTargetsList.textContent = names.join(", ");
    return;
  }
  const modelName = getModelDisplayName(modelKey);
  morphTargetsList.textContent =
    fallback || `No morph targets available for ${modelName}.`;
}

function updateAidenMorphTargets() {
  if (!mouthMesh || !mouthMesh.morphTargetDictionary) {
    showMorphTargetsList([], null, "aiden");
    return;
  }
  const names = Object.keys(mouthMesh.morphTargetDictionary).sort();
  showMorphTargetsList(names, null, "aiden");
}

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

const loadFaceModel = async (idx = 0) => {
  if (idx === 0) {
    clearFaceModel();
    setMorphListText("Loading FaceCap morph targets...");
  }
  if (idx >= faceUrls.length) {
    console.error("Failed to load FaceCap model from three.js.");
    setMorphListText("Failed to load FaceCap.");
    return;
  }
  await meshoptReady;
  loader.load(
    faceUrls[idx],
    (gltf) => {
      const face = gltf.scene;
      faceObject = face;
      const box = new THREE.Box3().setFromObject(face);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const targetHeight = 1.6;
      const scale = size.y > 0 ? targetHeight / size.y : 1;

      face.scale.setScalar(scale);
      face.position.sub(center.multiplyScalar(scale));
      face.position.add(orbitTarget);

      scene.add(face);
      const collected = new Set();
      face.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          morphTargetMeshes.push(child);
          const targetNames = Object.keys(child.morphTargetDictionary);
          console.info("Loaded morph targets:", targetNames);
          console.info(
            "Mesh name:",
            child.name || "(unnamed)",
            "Morph count:",
            targetNames.length
          );
          targetNames.forEach((name) => collected.add(name));
        }
      });
      showMorphTargetsList(
        Array.from(collected).sort(),
        "FaceCap model has no morph targets."
      );
      updateSphericalFromCamera();
      updateCameraFromSpherical();
      applyVisemePose(visemeSelect?.value || "sil", externalIntensity);
    },
    undefined,
    (error) => {
      console.error("Failed to load FaceCap model:", error);
      loadFaceModel(idx + 1);
    }
  );
};

const setModelMode = (mode) => {
  if (currentModelMode === mode) return;
  currentModelMode = mode;
  if (mode === "facecap") {
    removeAidenModel();
    loadFaceModel();
  } else {
    clearFaceModel();
    updateAidenMorphTargets();
    addAidenModel();
  }
};

if (modelSelect) {
  modelSelect.value = selectedModel;
  modelSelect.addEventListener("change", () => {
    const next = modelSelect.value;
    window.localStorage?.setItem("selectedModel", next);
    setModelMode(next);
  });
}

if (useFaceModel) {
  loadFaceModel();
} else {
  addAidenModel();
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
