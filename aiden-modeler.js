const viewport = document.getElementById("viewport");
const scene = new THREE.Scene();

scene.background = createGradientBackground();

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const defaultCameraPosition = new THREE.Vector3(0, 1.35, 5.2);
camera.position.copy(defaultCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const orbitTarget = new THREE.Vector3(0, 1.2, 0);
const spherical = new THREE.Spherical();
const minRadius = 2.2;
const maxRadius = 10;

renderer.domElement.style.touchAction = "none";
updateSphericalFromCamera();
updateCameraFromSpherical();

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
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
  console.error("AidenModel not found. Load aiden.js before aiden-modeler.js.");
}
const { group: aidenGroup, parts } = model || {};
const safeParts = parts || {};
scene.add(aidenGroup);

const gridHelper = new THREE.GridHelper(8, 16, 0x2c2f3a, 0x1b1f28);
gridHelper.position.y = -0.65;
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(1.2);
axesHelper.position.y = -0.65;
scene.add(axesHelper);

const explodeSlider = document.getElementById("explode");
const explodeValue = document.getElementById("explodeValue");
const highlightSelect = document.getElementById("highlightPart");

const browSliders = {
  raise: document.getElementById("brow-raise"),
  tilt: document.getElementById("brow-tilt"),
};
const browValues = {
  raise: document.getElementById("brow-raise-value"),
  tilt: document.getElementById("brow-tilt-value"),
};
const browDefaults = {
  raise: 0,
  tilt: 0,
};

const resetCamera = document.getElementById("resetCamera");
const toggleWireframe = document.getElementById("toggleWireframe");
const toggleGrid = document.getElementById("toggleGrid");
const toggleAxes = document.getElementById("toggleAxes");

const explodeDistance = 0.45;

const partEntries = [
  { id: "head", object: safeParts.head },
  { id: "torso", object: safeParts.torso },
  { id: "neck", object: safeParts.neck },
  { id: "glasses", object: safeParts.glasses },
  { id: "eyes", object: safeParts.eyes },
  { id: "eyebrows", object: safeParts.eyebrows },
].filter((entry) => entry.object);

partEntries.forEach(({ object }) => {
  object.userData.basePosition = object.position.clone();
  const direction = object.position.clone().normalize();
  object.userData.explodeDir = direction.lengthSq() > 0 ? direction : new THREE.Vector3(0, 1, 0);
});

Object.entries({
  "part-head": "head",
  "part-torso": "torso",
  "part-neck": "neck",
  "part-glasses": "glasses",
  "part-eyes": "eyes",
  "part-eyebrows": "eyebrows",
}).forEach(([inputId, partId]) => {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("change", (event) => {
    if (safeParts[partId]) {
      safeParts[partId].visible = event.target.checked;
    }
  });
});

explodeSlider.addEventListener("input", (event) => {
  const amount = Number(event.target.value);
  explodeValue.textContent = amount.toFixed(2);
  applyExplode(amount);
});

highlightSelect.addEventListener("change", (event) => {
  setHighlight(event.target.value);
});

Object.entries(browSliders).forEach(([name, input]) => {
  input.addEventListener("input", () => {
    updateEyebrows();
  });
});

Object.entries(browDefaults).forEach(([name, value]) => {
  if (browSliders[name]) {
    browSliders[name].value = value.toString();
  }
});
updateEyebrows();

toggleWireframe.addEventListener("change", (event) => {
  setWireframe(event.target.checked);
});

toggleGrid.addEventListener("change", (event) => {
  gridHelper.visible = event.target.checked;
});

toggleAxes.addEventListener("change", (event) => {
  axesHelper.visible = event.target.checked;
});

resetCamera.addEventListener("click", () => {
  camera.position.copy(defaultCameraPosition);
  updateSphericalFromCamera();
  updateCameraFromSpherical();
});

function updateEyebrows() {
  const raise = Number(browSliders.raise?.value || 0);
  const tilt = Number(browSliders.tilt?.value || 0);
  if (browValues.raise) {
    browValues.raise.textContent = raise.toFixed(2);
  }
  if (browValues.tilt) {
    browValues.tilt.textContent = tilt.toFixed(2);
  }
  window.AidenModel?.updateEyebrows?.(safeParts.eyebrows, {
    eyebrowRaise: raise,
    eyebrowTilt: tilt,
  });
}

function applyExplode(amount) {
  partEntries.forEach(({ object }) => {
    const base = object.userData.basePosition;
    const direction = object.userData.explodeDir;
    object.position.copy(base).addScaledVector(direction, amount * explodeDistance);
  });
}

function setWireframe(enabled) {
  partEntries.forEach(({ object }) => {
    applyToMeshes(object, (mesh) => {
      if (mesh.material && "wireframe" in mesh.material) {
        mesh.material.wireframe = enabled;
      }
    });
  });
}

let highlightedId = "";
function setHighlight(partId) {
  if (highlightedId) {
    clearHighlight(highlightedId);
  }
  highlightedId = partId || "";
  if (!highlightedId) return;
  const target = safeParts[highlightedId];
  if (!target) return;
  applyToMeshes(target, (mesh) => {
    if (mesh.material && "emissive" in mesh.material) {
      if (!mesh.userData.originalEmissive) {
        mesh.userData.originalEmissive = mesh.material.emissive.clone();
      }
      if (!mesh.userData.originalEmissiveIntensity) {
        mesh.userData.originalEmissiveIntensity = mesh.material.emissiveIntensity || 0;
      }
      mesh.material.emissive.set(0x2b6df3);
      mesh.material.emissiveIntensity = 0.7;
    }
  });
}

function clearHighlight(partId) {
  const target = safeParts[partId];
  if (!target) return;
  applyToMeshes(target, (mesh) => {
    if (mesh.material && "emissive" in mesh.material && mesh.userData.originalEmissive) {
      mesh.material.emissive.copy(mesh.userData.originalEmissive);
      mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity || 0;
    }
  });
}

function applyToMeshes(root, handler) {
  root.traverse((child) => {
    if (child.isMesh) {
      handler(child);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateCameraFromSpherical();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

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
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener("pointerdown", (event) => {
  isDragging = true;
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

  const rotateSpeed = 0.005;
  spherical.theta -= deltaX * rotateSpeed;
  spherical.phi -= deltaY * rotateSpeed;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.2, Math.PI - 0.2);
  updateCameraFromSpherical();
});

renderer.domElement.addEventListener("pointerup", (event) => {
  isDragging = false;
  renderer.domElement.releasePointerCapture(event.pointerId);
});

renderer.domElement.addEventListener("pointerleave", () => {
  isDragging = false;
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
