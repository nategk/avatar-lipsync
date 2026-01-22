import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const MODEL_REPO = "onnx-community/Kokoro-82M-v1.0-ONNX-timestamped";
const VOICE_REPO = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICES = ["am_eric"];

const TRANSFORMERS_VERSION = "3.8.1";
const ORT_VERSION = "1.22.0-dev.20250409-89f8206ba4";

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  await ensureDir(path.dirname(dest));
  const stream = createWriteStream(dest);
  await pipeline(response.body, stream);
  return dest;
}

async function downloadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return response.json();
}

async function copyWasmAssetsFromNodeModules() {
  const ortDir = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");
  const transformersDir = path.join(rootDir, "vendor", "transformers");
  try {
    const files = await readdir(ortDir);
    const wasmFiles = files.filter((name) => name.endsWith(".wasm"));
    if (!wasmFiles.length) {
      return false;
    }
    await ensureDir(transformersDir);
    for (const filename of wasmFiles) {
      const src = path.join(ortDir, filename);
      const dest = path.join(transformersDir, filename);
      await pipeline(createReadStream(src), createWriteStream(dest));
    }
    return true;
  } catch {
    return false;
  }
}

async function downloadTransformersAssets() {
  const transformersDir = path.join(rootDir, "vendor", "transformers");
  await ensureDir(transformersDir);

  // Prefer a bundled transformers build generated from node_modules.
  const bundleScript = path.join(rootDir, "scripts", "bundle-transformers.mjs");
  try {
    await import(bundleScript);
  } catch (error) {
    console.warn("Bundle step failed, falling back to CDN files.", error?.message || error);
  }

  // Ensure a bundle exists; if not, fall back to CDN downloads.
  try {
    await stat(path.join(transformersDir, "transformers.bundle.mjs"));
  } catch {
    await download(
      `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.web.js`,
      path.join(transformersDir, "transformers.bundle.mjs")
    );
  }

  const copied = await copyWasmAssetsFromNodeModules();
  if (!copied) {
    await download(
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.jsep.wasm`,
      path.join(transformersDir, "ort-wasm-simd-threaded.jsep.wasm")
    );

    await download(
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`,
      path.join(transformersDir, "ort-wasm-simd-threaded.wasm")
    );
  }
}

async function downloadModelAssets() {
  const modelDir = path.join(rootDir, "vendor", "headtts-model");
  await ensureDir(modelDir);

  const modelInfo = await downloadJson(
    `https://huggingface.co/api/models/${MODEL_REPO}`
  );

  const allowExt = new Set([".onnx", ".json", ".txt", ".model"]);
  const files = (modelInfo.siblings || [])
    .map((item) => item.rfilename)
    .filter((name) => allowExt.has(path.extname(name)))
    .filter((name) => !name.toLowerCase().includes("readme"));

  for (const filename of files) {
    const url = `https://huggingface.co/${MODEL_REPO}/resolve/main/${filename}`;
    const dest = path.join(modelDir, filename);
    await download(url, dest);
  }
}

async function downloadVoiceAssets() {
  const voicesDir = path.join(rootDir, "vendor", "headtts-voices");
  await ensureDir(voicesDir);

  const voiceInfo = await downloadJson(
    `https://huggingface.co/api/models/${VOICE_REPO}`
  );
  const siblings = (voiceInfo.siblings || []).map((item) => item.rfilename);

  for (const voice of VOICES) {
    const filename = `voices/${voice}.bin`;
    if (!siblings.includes(filename)) {
      throw new Error(`Voice ${voice} not found in ${VOICE_REPO}`);
    }
    const url = `https://huggingface.co/${VOICE_REPO}/resolve/main/${filename}`;
    const dest = path.join(voicesDir, `${voice}.bin`);
    await download(url, dest);
  }
}

async function main() {
  console.log("Downloading transformers + onnxruntime assets...");
  await downloadTransformersAssets();

  console.log("Downloading HeadTTS model assets...");
  await downloadModelAssets();

  console.log("Downloading voice assets...");
  await downloadVoiceAssets();

  console.log("All assets downloaded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
