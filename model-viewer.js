import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "./vendor/meshopt_decoder.module.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import faceCapVisemeMapping, {
  ARKIT_BLENDSHAPES,
  FACE_CAP_REST_STATE,
} from "./data/viseme-mapping.js";

const viewport = document.getElementById("viewport");
const scene = new THREE.Scene();

scene.background = createGradientBackground();

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const defaultCameraPosition = new THREE.Vector3(-0.6, 1.25, 6.2);
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
const focusBoxCenter = new THREE.Vector3();
const focusBoxSize = new THREE.Vector3();

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
  if (aidenGroup) {
    const box = new THREE.Box3().setFromObject(aidenGroup);
    if (!box.isEmpty()) {
      focusOnBoundingBox(box);
    }
  }
  setVisemePanelVisibility(true);
  renderVisemeTuner(visemeSelect?.value || currentTunerViseme);
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
  showMorphTargetsList([], "FaceCap morph targets will populate after loading.", "facecap");
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
const modelSelect = document.getElementById("modelSelect");
const morphTargetsList = document.getElementById("morphTargetsList");
const morphTargetsWindow = document.querySelector(".target-window");
const morphTargetsHeader = document.querySelector(".target-window__header");
const visemeTunerList = document.getElementById("visemeTunerList");
const visemeTunerStatus = document.getElementById("visemeTunerStatus");
const saveVisemeFileBtn = document.getElementById("saveVisemeToFile");
const visemeFileStatus = document.getElementById("visemeFileStatus");
const VISME_MAPPING_SERVER_URL = "http://localhost:3001/viseme-mapping";
const visemePanelTitle = document.getElementById("visemePanelTitle");
const visemePanel = document.getElementById("visemePanel");
const MODEL_INFO = {
  aiden: { displayName: "Aiden (cartoon)" },
  facecap: { displayName: "FaceCap (morph targets)" },
  apple: { displayName: "Apple ARKit rig" },
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
  browDown_L: "browDownLeft",
  browDown_R: "browDownRight",
  browInnerUp: "browInnerUp",
  browOuterUp_L: "browOuterUpLeft",
  browOuterUp_R: "browOuterUpRight",
};

function normalizeBlendshapeName(name) {
  if (!name) return name;
  const direct = FACE_CAP_CANONICAL[name] || FACE_CAP_CANONICAL[name.toLowerCase()];
  if (direct) return direct;
  let normalized = String(name).trim();
  const suffixMatch = normalized.match(/_(l|r)$/i);
  let suffix = "";
  if (suffixMatch) {
    normalized = normalized.slice(0, -2);
    suffix = suffixMatch[1].toLowerCase() === "l" ? "Left" : "Right";
  }
  normalized = normalized.replace(/[_\s-]+/g, "");
  normalized = normalized.replace(/([a-z])([A-Z])/g, "$1$2");
  normalized = normalized.replace(/^\d+/, "");
  return normalized + suffix;
}

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

const visemePoseMap = faceCapVisemeMapping;
const customVisemeOverrides = {};

function normalizeVisemeKey(viseme) {
  return normalizeViseme(viseme);
}

function getVisemeOverrides(viseme) {
  const key = normalizeVisemeKey(viseme);
  if (!customVisemeOverrides[key]) {
    customVisemeOverrides[key] = { mouth: {}, brows: {} };
  }
  return customVisemeOverrides[key];
}

function setVisemeOverride(viseme, group, key, value) {
  const overrides = getVisemeOverrides(viseme);
  overrides[group] = overrides[group] || {};
  overrides[group][key] = value;
}

function getVisemeOverride(viseme, group, key) {
  const overrides = customVisemeOverrides[normalizeVisemeKey(viseme)];
  if (!overrides || !overrides[group]) return undefined;
  return overrides[group][key];
}

function applyVisemePose(viseme, intensity) {
  const normalized = normalizeViseme(viseme);
  const pose = visemePoseMap[normalized] || visemePoseMap.sil;
  const isRest = normalized === "sil";
  const baseMouth = isRest
    ? {}
    : { ...FACE_CAP_REST_STATE.mouth, ...(pose.mouth || {}) };
  const baseBrows = isRest
    ? {}
    : { ...FACE_CAP_REST_STATE.brows, ...(pose.brows || {}) };
  const overrides = getVisemeOverrides(normalized);
  const finalMouth = { ...baseMouth, ...overrides.mouth };
  const finalBrows = { ...baseBrows, ...overrides.brows };
  const amt = Math.max(0, Math.min(1, intensity));

  const nextPose = {};
  Object.entries(finalMouth).forEach(([key, value]) => {
    nextPose[key] = (value || 0) * amt;
  });
  Object.entries(finalBrows).forEach(([key, value]) => {
    nextPose[key] = (value || 0) * amt;
  });

  pendingMouthPose = nextPose;
  currentExpressions.eyebrowRaise = (finalBrows.eyebrowRaise || 0) * amt;
  currentExpressions.eyebrowTilt = (finalBrows.eyebrowTilt || 0) * amt;

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
  const canonical = normalizeBlendshapeName(name);
  name = canonical;
  if (name in targets) return targets[name] || 0;
  const lower = name.toLowerCase();
  if (lower.includes("jawopen")) return targets.jawOpen || 0;
  if (lower.includes("mouthopen")) return targets.jawOpen || 0;
  if (lower.includes("mouthclose")) return targets.mouthClose || 0;
  if (lower.includes("funnel")) return targets.mouthFunnel || 0;
  if (lower.includes("pucker") || lower.includes("kiss")) return targets.mouthPucker || 0;
  if (lower.includes("browdown")) return targets.browDownLeft || targets.browDownRight || 0;
  if (lower.includes("browinnerup")) return targets.browInnerUp || 0;
  if (lower.includes("browouterup")) return (targets.browOuterUpLeft || targets.browOuterUpRight || 0);
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
const appleModelPath = "./models/apple-reference/ARFaceGeometry.obj";
const appleLoader = new OBJLoader();
let appleObject = null;

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

function setMorphTargetsWindow(expanded) {
  if (!morphTargetsWindow) return;
  morphTargetsWindow.classList.toggle("collapsed", !expanded);
  morphTargetsWindow.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function setVisemePanelVisibility(visible) {
  if (!visemePanel) return;
  visemePanel.classList.toggle("visible", visible);
}

function logBlendshapeCoverage(mesh, canonicalList, modelKey) {
  if (!mesh?.morphTargetDictionary) {
    console.info(`${getModelDisplayName(modelKey)} has no morph targets.`);
    return;
  }
  const keys = Object.keys(mesh.morphTargetDictionary);
  const missing = canonicalList.filter((name) => !keys.includes(name));
  if (missing.length) {
    console.debug(
      `${getModelDisplayName(modelKey)} missing ${missing.length} canonical blendshapes:`,
      missing
    );
  } else {
    console.debug(`${getModelDisplayName(modelKey)} covers all ${canonicalList.length} canonical blendshapes.`);
  }
}

let currentTunerViseme = visemeSelect?.value || "sil";
let visemeTunerDirty = false;

function markVisemeTunerDirty() {
  visemeTunerDirty = true;
  if (visemeTunerStatus) {
    visemeTunerStatus.textContent = "Unsaved changes";
  }
}

function getAvailableMorphTargets() {
  const names = new Set();
  morphTargetMeshes.forEach((mesh) => {
    if (mesh?.morphTargetDictionary) {
      Object.keys(mesh.morphTargetDictionary).forEach((name) => names.add(name));
    }
  });
  if (!names.size) {
    Object.keys(FACE_CAP_REST_STATE.mouth || {}).forEach((name) => names.add(name));
    Object.keys(FACE_CAP_REST_STATE.brows || {}).forEach((name) => names.add(name));
  }
  return Array.from(names).sort();
}

function categorizeBlendshape(name) {
  const canonical = normalizeBlendshapeName(name);
  const lower = canonical.toLowerCase();
  return lower.includes("brow") ? "brows" : "mouth";
}

function renderVisemeTuner(viseme) {
  const normalizedViseme = normalizeViseme(viseme);
  currentTunerViseme = normalizedViseme;
  if (visemePanelTitle) {
    visemePanelTitle.textContent = `${normalizedViseme} tuning`;
  }
  if (!visemeTunerList) return;
  visemeTunerList.innerHTML = "";
  let hasRows = false;
  const entry = getVisemeEntry(viseme);
  const availableMorphs = getAvailableMorphTargets();
  if (!availableMorphs.length) {
    visemeTunerList.textContent = "No morph targets loaded yet.";
    return;
  }
  const header = document.createElement("div");
  header.textContent = "Available morph targets";
  header.style.fontSize = "12px";
  header.style.opacity = "0.65";
  visemeTunerList.appendChild(header);
  availableMorphs.forEach((morphName) => {
    const canonical = normalizeBlendshapeName(morphName);
    const group = categorizeBlendshape(canonical);
    const row = document.createElement("div");
    row.className = "row";
    const labelText = document.createElement("label");
    labelText.textContent = morphName;
    labelText.style.flex = "1";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1";
    slider.step = "0.01";
    const overrideValue = getVisemeOverride(normalizedViseme, group, canonical);
    const value = entry[group]?.[canonical] ?? overrideValue ?? 0;
    slider.value = String(value);
    slider.dataset.group = group;
    slider.dataset.canonical = canonical;
    slider.dataset.name = morphName;
    slider.style.flex = "2";
    const valueLabel = document.createElement("div");
    valueLabel.className = "value";
    valueLabel.textContent = slider.value;
    slider.addEventListener("input", (event) => {
      const next = Number(event.target.value);
      const groupName = event.target.dataset.group;
      const blendKey = event.target.dataset.canonical;
      if (!entry[groupName]) {
        entry[groupName] = {};
      }
      entry[groupName][blendKey] = next;
      setVisemeOverride(currentTunerViseme, groupName, blendKey, next);
      valueLabel.textContent = next.toFixed(2);
      markVisemeTunerDirty();
      applyVisemePose(currentTunerViseme, externalIntensity);
    });
    row.appendChild(labelText);
    row.appendChild(slider);
    row.appendChild(valueLabel);
    visemeTunerList.appendChild(row);
    hasRows = true;
  });
  if (!hasRows) {
    visemeTunerList.textContent = "No blendshapes defined for this viseme yet.";
  }
}

renderVisemeTuner(currentTunerViseme);
setVisemePanelVisibility(true);
applyVisemePose(currentTunerViseme, externalIntensity);

function getVisemeEntry(viseme) {
  const normalized = normalizeViseme(viseme);
  if (!faceCapVisemeMapping[normalized]) {
    faceCapVisemeMapping[normalized] = { mouth: {}, brows: {} };
  }
  return faceCapVisemeMapping[normalized];
}
function collectVisemeMappingPayload() {
  const payload = {};
  Object.entries(faceCapVisemeMapping).forEach(([viseme, definition]) => {
    payload[viseme] = {
      mouth: { ...definition.mouth },
      brows: { ...definition.brows },
    };
  });
  return payload;
}

async function saveVisemeMappingToFile() {
  if (!saveVisemeFileBtn) return;
  if (visemeFileStatus) {
    visemeFileStatus.textContent = "Writing to file...";
  }
  saveVisemeFileBtn.disabled = true;
  try {
    const response = await fetch(VISME_MAPPING_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectVisemeMappingPayload()),
    });
    const json = await response.json().catch(() => null);
    if (response.ok && json?.success) {
      if (visemeFileStatus) {
        visemeFileStatus.textContent = "Saved to file";
      }
    } else {
      if (visemeFileStatus) {
        const message = json?.error || response.statusText || "Unknown error";
        visemeFileStatus.textContent = `File save failed: ${message}`;
      }
    }
  } catch (error) {
    if (visemeFileStatus) {
      visemeFileStatus.textContent = `File save failed: ${error.message}`;
    }
  } finally {
    saveVisemeFileBtn.disabled = false;
  }
}

function loadAppleModel() {
  showMorphTargetsList([], `Loading ${getModelDisplayName("apple")}...`, "apple");
  appleLoader.load(
    appleModelPath,
    (obj) => {
      appleObject = obj;
      appleObject.scale.setScalar(0.02);
      appleObject.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshNormalMaterial();
        }
      });
      appleObject.position.copy(orbitTarget);
      scene.add(appleObject);
      showMorphTargetsList([], `${getModelDisplayName("apple")} has no morph targets.`, "apple");
      focusOnBoundingBox(new THREE.Box3().setFromObject(appleObject));
    },
    undefined,
    (error) => {
      console.error("Failed to load Apple model:", error);
      setMorphListText("Failed to load Apple reference model.");
    }
  );
}

function removeAppleModel() {
  if (appleObject) {
    scene.remove(appleObject);
    appleObject = null;
  }
}

function updateAidenMorphTargets() {
  if (!mouthMesh || !mouthMesh.morphTargetDictionary) {
    showMorphTargetsList([], null, "aiden");
    return;
  }
  const names = Object.keys(mouthMesh.morphTargetDictionary).sort();
  showMorphTargetsList(names, null, "aiden");
  logBlendshapeCoverage(mouthMesh, ARKIT_BLENDSHAPES, "aiden");
}

if (morphTargetsHeader) {
  morphTargetsHeader.addEventListener("click", () => {
    const expanded = morphTargetsWindow?.classList.contains("collapsed");
    setMorphTargetsWindow(Boolean(expanded));
  });
}

if (visemeSelect) {
  visemeSelect.addEventListener("change", (event) => {
    setVisemePanelVisibility(true);
    const value = event.target.value;
    applyVisemePose(value, externalIntensity);
    renderVisemeTuner(value);
  });
}

if (saveVisemeFileBtn) {
  saveVisemeFileBtn.addEventListener("click", saveVisemeMappingToFile);
}

const loadFaceModel = async (idx = 0) => {
  setVisemePanelVisibility(false);
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

      scene.add(face);
      const collected = new Set();
      let firstBlendMesh = null;
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
          if (!firstBlendMesh) {
            firstBlendMesh = child;
          }
        }
      });
        showMorphTargetsList(
          Array.from(collected).sort(),
          "FaceCap model has no morph targets."
        );
        if (firstBlendMesh) {
          logBlendshapeCoverage(firstBlendMesh, ARKIT_BLENDSHAPES, "facecap");
        }
      focusOnBoundingBox(new THREE.Box3().setFromObject(face));
      setVisemePanelVisibility(true);
      renderVisemeTuner(visemeSelect?.value || "sil");
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
  setVisemePanelVisibility(false);
  if (currentModelMode === mode) return;
  currentModelMode = mode;
  if (mode === "facecap") {
    removeAidenModel();
    loadFaceModel();
    removeAppleModel();
  } else if (mode === "apple") {
    removeAidenModel();
    clearFaceModel();
    loadAppleModel();
  } else {
    clearFaceModel();
    removeAppleModel();
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
  updateAidenMorphTargets();
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

function focusOnBoundingBox(box) {
  if (!box || typeof box.getSize !== "function" || typeof box.getCenter !== "function") {
    return;
  }
  box.getSize(focusBoxSize);
  box.getCenter(focusBoxCenter);
  orbitTarget.copy(focusBoxCenter);
  const maxSize = Math.max(focusBoxSize.x, focusBoxSize.y, focusBoxSize.z, 0.1);
  spherical.radius = THREE.MathUtils.clamp(maxSize * 1.5, minRadius, maxRadius);
  updateCameraFromSpherical();
  updateSphericalFromCamera();
}
