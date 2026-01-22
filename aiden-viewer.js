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
const mouthMesh = model?.mouthMesh || model?.parts?.mouth;
const eyebrows = model?.parts?.eyebrows;

if (aidenGroup) {
  scene.add(aidenGroup);
}

const morphTargets = ["mouthOpen", "wide", "smile"];
const targetInfluences = Object.fromEntries(morphTargets.map((name) => [name, 0]));
const currentInfluences = Object.fromEntries(morphTargets.map((name) => [name, 0]));

const expressionTargets = {
  eyebrowRaise: 0,
  eyebrowTilt: 0,
  smile: 0,
};
const currentExpressions = {
  eyebrowRaise: 0,
  eyebrowTilt: 0,
  smile: 0,
};

const visemeMap = {
  sil: { mouthOpen: 0, wide: 0 },
  AA: { mouthOpen: 0.5, wide: 0.35 },
  EE: { mouthOpen: 0.25, wide: 0.4 },
  OO: { mouthOpen: 0.35, wide: 0.05 },
  MM: { mouthOpen: 0, wide: 0 },
  FF: { mouthOpen: 0.2, wide: 0.1 },
  TH: { mouthOpen: 0.5, wide: 0.2 },
  CH: { mouthOpen: 0.4, wide: 0.1 },
  SS: { mouthOpen: 0.2, wide: 0.7 },
  DD: { mouthOpen: 0.35, wide: 0.15 },
  kk: { mouthOpen: 0.25, wide: 0.1 },
  nn: { mouthOpen: 0.15, wide: 0.1 },
  RR: { mouthOpen: 0.3, wide: 0.05 },
  aa: { mouthOpen: 0.5, wide: 0.35 },
  E: { mouthOpen: 0.25, wide: 0.35 },
  I: { mouthOpen: 0.18, wide: 0.3 },
  O: { mouthOpen: 0.35, wide: 0.05 },
  U: { mouthOpen: 0.25, wide: 0 },
  PP: { mouthOpen: 0, wide: 0 },
};

const expressionMap = {
  sil: { smile: 0.1, eyebrowRaise: 0.05, eyebrowTilt: 0 },
  AA: { smile: 0.15, eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  EE: { smile: 0.3, eyebrowRaise: 0.12, eyebrowTilt: 0.02 },
  OO: { smile: 0.05, eyebrowRaise: 0.08, eyebrowTilt: -0.01 },
  MM: { smile: 0.08, eyebrowRaise: 0.05, eyebrowTilt: 0 },
  FF: { smile: 0.1, eyebrowRaise: 0.06, eyebrowTilt: 0 },
  TH: { smile: 0.15, eyebrowRaise: 0.12, eyebrowTilt: 0.03 },
  CH: { smile: 0.12, eyebrowRaise: 0.08, eyebrowTilt: 0.01 },
  SS: { smile: 0.2, eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  DD: { smile: 0.08, eyebrowRaise: 0.05, eyebrowTilt: 0 },
  kk: { smile: 0.1, eyebrowRaise: 0.06, eyebrowTilt: 0 },
  nn: { smile: 0.1, eyebrowRaise: 0.06, eyebrowTilt: 0 },
  RR: { smile: 0.12, eyebrowRaise: 0.07, eyebrowTilt: 0.01 },
  aa: { smile: 0.15, eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  E: { smile: 0.25, eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  I: { smile: 0.25, eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
  O: { smile: 0.08, eyebrowRaise: 0.08, eyebrowTilt: -0.01 },
  U: { smile: 0.05, eyebrowRaise: 0.07, eyebrowTilt: -0.01 },
  PP: { smile: 0.06, eyebrowRaise: 0.05, eyebrowTilt: 0 },
};

let currentViseme = "sil";
let intensity = 1.0;
let externalViseme = null;
let externalIntensity = 1.0;
let useExternalViseme = false;

const visemeSelect = document.getElementById("viseme");
const intensitySlider = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");

visemeSelect?.addEventListener("change", (event) => {
  currentViseme = event.target.value;
  updateTargets();
});

intensitySlider?.addEventListener("input", (event) => {
  intensity = Number(event.target.value);
  if (intensityValue) {
    intensityValue.textContent = intensity.toFixed(2);
  }
  updateTargets();
});

updateTargets();

function updateTargets() {
  const activeViseme = useExternalViseme ? externalViseme : currentViseme;
  const activeIntensity = useExternalViseme ? externalIntensity : intensity;
  const base = visemeMap[activeViseme] || visemeMap.sil;
  const expression = expressionMap[activeViseme] || expressionMap.sil;
  morphTargets.forEach((name) => {
    if (name === "smile") {
      targetInfluences[name] = (expression.smile || 0) * activeIntensity;
    } else {
      targetInfluences[name] = (base[name] || 0) * activeIntensity;
    }
  });
  expressionTargets.eyebrowRaise = (expression.eyebrowRaise || 0) * activeIntensity;
  expressionTargets.eyebrowTilt = (expression.eyebrowTilt || 0) * activeIntensity;
}

function animate() {
  requestAnimationFrame(animate);

  if (!mouthMesh) return;

  const lerpSpeed = 0.12;
  morphTargets.forEach((name) => {
    currentInfluences[name] = THREE.MathUtils.lerp(
      currentInfluences[name],
      targetInfluences[name],
      lerpSpeed
    );
  });

  currentExpressions.eyebrowRaise = THREE.MathUtils.lerp(
    currentExpressions.eyebrowRaise,
    expressionTargets.eyebrowRaise,
    lerpSpeed
  );
  currentExpressions.eyebrowTilt = THREE.MathUtils.lerp(
    currentExpressions.eyebrowTilt,
    expressionTargets.eyebrowTilt,
    lerpSpeed
  );
  window.AidenModel?.updateEyebrows?.(eyebrows, currentExpressions);

  window.AidenModel?.updateMouthMesh?.(mouthMesh, currentInfluences);
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
    useExternalViseme = true;
    externalViseme = viseme || "sil";
    externalIntensity = Math.max(0, Math.min(1, amount));
    updateTargets();
  },
  clearViseme() {
    useExternalViseme = false;
    externalViseme = null;
    updateTargets();
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
