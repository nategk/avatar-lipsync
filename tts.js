import { HeadTTS } from "./vendor/headtts/headtts.mjs";

const ttsStatus = document.getElementById("ttsStatus");
const speakBtn = document.getElementById("speakBtn");
const textInput = document.getElementById("ttsInput");
const perfInitTotal = document.getElementById("perfInitTotal");
const perfConnect = document.getElementById("perfConnect");
const perfSetup = document.getElementById("perfSetup");
const perfSynthesize = document.getElementById("perfSynthesize");
const perfDecode = document.getElementById("perfDecode");
const perfAudioStart = document.getElementById("perfAudioStart");
const perfVisemeStart = document.getElementById("perfVisemeStart");
const perfPlayback = document.getElementById("perfPlayback");

let tts = null;
let ttsReady = false;
let ttsConnecting = false;
let currentAudio = null;
let currentUrl = null;
let rafId = null;
let audioCtx = null;
let lastSynthEnd = null;

function updateStatus(text) {
  if (ttsStatus) {
    ttsStatus.textContent = text;
  }
}

function setPerf(el, label, ms) {
  if (!el) return;
  if (ms === null || ms === undefined) {
    el.textContent = `${label}: —`;
  } else {
    el.textContent = `${label}: ${ms.toFixed(0)} ms`;
  }
}

function supportsModuleWorkers() {
  try {
    let supported = false;
    const testBlob = new Blob([""], { type: "application/javascript" });
    const testUrl = URL.createObjectURL(testBlob);
    const worker = new Worker(testUrl, {
      get type() {
        supported = true;
      },
    });
    worker.terminate();
    URL.revokeObjectURL(testUrl);
    return supported;
  } catch {
    return false;
  }
}

function formatProgress(ev) {
  if (!ev || !ev.lengthComputable) return "Loading TTS model...";
  const percent = Math.round((ev.loaded / ev.total) * 100);
  return `Loading TTS model... ${percent}%`;
}

async function ensureTtsReady() {
  if (ttsReady || ttsConnecting) return;
  ttsConnecting = true;
  updateStatus("Initializing HeadTTS...");
  const initStart = performance.now();

  if (!supportsModuleWorkers()) {
    updateStatus("Module workers unsupported. Use a modern browser.");
    ttsConnecting = false;
    return;
  }

  const baseUrl = new URL(".", window.location.href);
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    updateStatus("Run this page from a web server (http/https).");
    ttsConnecting = false;
    return;
  }
  const assetBase = baseUrl.href;

  const dictionaryURL = new URL("vendor/headtts/", assetBase).href;
  const transformersModule = new URL(
    "vendor/transformers/transformers.bundle.mjs",
    assetBase
  ).href;
  const modelId = "headtts-model";
  const localModelPath = new URL("vendor/", assetBase).href;
  const voiceURL = new URL("vendor/headtts-voices", assetBase).href;
  const workerModule = new URL("vendor/headtts/worker-tts.mjs", baseUrl).href;

  tts = new HeadTTS({
    endpoints: ["webgpu", "wasm"],
    dtypeWebgpu: "fp32",
    dtypeWasm: "q8",
    dictionaryURL,
    transformersModule,
    model: modelId,
    localModelPath,
    allowLocalModels: true,
    allowRemoteModels: false,
    voiceURL,
    voices: ["am_eric"],
    languages: ["en-us"],
    workerModule,
  });

  try {
    const connectStart = performance.now();
    await tts.connect(null, (progress) => updateStatus(formatProgress(progress)));
    setPerf(perfConnect, "Model load", performance.now() - connectStart);
    const setupStart = performance.now();
    await tts.setup({
      voice: "am_eric",
      language: "en-us",
      speed: 1,
      audioEncoding: "wav",
    });
    setPerf(perfSetup, "Voice setup", performance.now() - setupStart);
    ttsReady = true;
    updateStatus("TTS ready");
    setPerf(perfInitTotal, "Init total", performance.now() - initStart);
  } catch (error) {
    console.error(error);
    updateStatus("TTS failed to initialize. Check console.");
    setPerf(perfInitTotal, "Init total", performance.now() - initStart);
  } finally {
    ttsConnecting = false;
  }
}

function stopCurrentPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (window.aidenVisemeDriver) {
    window.aidenVisemeDriver.clearViseme();
  }
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

async function normalizeAudioBuffer(audioData) {
  if (!audioData) return null;
  if (audioData instanceof AudioBuffer) {
    return audioData;
  }
  if (audioData instanceof ArrayBuffer) return audioData;
  if (ArrayBuffer.isView(audioData)) {
    return audioData.buffer.slice(
      audioData.byteOffset,
      audioData.byteOffset + audioData.byteLength
    );
  }
  if (audioData.buffer instanceof ArrayBuffer) return audioData.buffer;
  if (audioData instanceof Blob) {
    return audioData.arrayBuffer();
  }
  return null;
}

function scheduleVisemes(getTimeMs, audioEndCallback, onFirstViseme) {
  const visemes = audioEndCallback.visemes || [];
  const vtimes = audioEndCallback.vtimes || [];
  const vdurations = audioEndCallback.vdurations || [];
  let index = 0;
  let firstHit = false;

  const step = () => {
    const t = getTimeMs();
    if (t < 0) {
      rafId = requestAnimationFrame(step);
      return;
    }
    while (index < vtimes.length - 1 && t >= vtimes[index] + vdurations[index]) {
      index += 1;
    }
    const viseme = visemes[index] || "sil";
    if (!firstHit) {
      firstHit = true;
      onFirstViseme?.();
    }
    if (window.aidenVisemeDriver) {
      window.aidenVisemeDriver.setViseme(viseme, 1);
    }
    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);
}

async function playWithVisemes(audioData) {
  stopCurrentPlayback();

  const playbackStart = performance.now();
  const audioBuffer = await normalizeAudioBuffer(audioData.audio);
  const context = getAudioContext();
  const payload = {
    visemes: audioData.visemes || [],
    vtimes: audioData.vtimes || [],
    vdurations: audioData.vdurations || [],
  };

  if (!audioBuffer) {
    console.warn("Audio buffer missing. audioData keys:", Object.keys(audioData || {}));
    console.warn("audioData.audio type:", audioData?.audio?.constructor?.name, audioData?.audio);
  }

  setPerf(perfDecode, "Audio decode", null);
  setPerf(perfAudioStart, "Audio start latency", null);
  setPerf(perfVisemeStart, "First viseme", null);
  setPerf(perfPlayback, "Playback duration", null);

  return new Promise((resolve) => {
    if (audioBuffer) {
      const playDecoded = (decoded, decodeMs) => {
        const source = context.createBufferSource();
        source.buffer = decoded;
          source.connect(context.destination);
          const startTime = context.currentTime + 0.01;
          source.start(startTime);
          updateStatus("Speaking...");
          setPerf(
            perfAudioStart,
            "Audio start latency",
            performance.now() - playbackStart
          );
          setPerf(perfDecode, "Audio decode", decodeMs ?? 0);

          scheduleVisemes(
            () => (context.currentTime - startTime) * 1000,
            payload,
            () => setPerf(perfVisemeStart, "First viseme", performance.now() - playbackStart)
          );

          source.onended = () => {
            stopCurrentPlayback();
            updateStatus("TTS idle");
            setPerf(
              perfPlayback,
              "Playback duration",
              performance.now() - playbackStart
            );
            resolve();
          };
      };

      if (audioBuffer instanceof AudioBuffer) {
        playDecoded(audioBuffer, 0);
      } else {
        const decodeStart = performance.now();
        context
          .decodeAudioData(audioBuffer.slice(0))
          .then((decoded) => playDecoded(decoded, performance.now() - decodeStart))
          .catch((error) => {
            console.error(error);
            updateStatus("Audio decode failed. Falling back.");
            fallbackToHtmlAudio(audioBuffer, payload, resolve, playbackStart);
          });
      }
    } else {
      fallbackToHtmlAudio(audioBuffer, payload, resolve, playbackStart);
    }
  });
}

function fallbackToHtmlAudio(audioBuffer, payload, resolve, playbackStart) {
  if (!audioBuffer) {
    updateStatus("Audio buffer missing.");
    resolve();
    return;
  }
  const blob = new Blob([audioBuffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  currentUrl = url;
  const audio = new Audio(url);
  currentAudio = audio;

  audio.addEventListener("play", () => {
    updateStatus("Speaking...");
    setPerf(
      perfAudioStart,
      "Audio start latency",
      performance.now() - playbackStart
    );
    scheduleVisemes(
      () => audio.currentTime * 1000,
      payload,
      () => setPerf(perfVisemeStart, "First viseme", performance.now() - playbackStart)
    );
  });

  audio.addEventListener("ended", () => {
    stopCurrentPlayback();
    updateStatus("TTS idle");
    setPerf(perfPlayback, "Playback duration", performance.now() - playbackStart);
    resolve();
  });

  audio.addEventListener("pause", () => {
    stopCurrentPlayback();
    updateStatus("TTS idle");
    resolve();
  });

  audio.play().catch((error) => {
    console.error(error);
    updateStatus("Audio playback blocked by browser.");
    stopCurrentPlayback();
    setPerf(perfPlayback, "Playback duration", performance.now() - playbackStart);
    resolve();
  });
}

async function speakText(text) {
  await ensureTtsReady();
  if (ttsReady && tts) {
    const synthStart = performance.now();
    setPerf(perfSynthesize, "Synthesis", null);
    const messages = await tts.synthesize({ input: text });
    const audioMessages = (messages || []).filter((msg) => msg.type === "audio");
    if (!audioMessages.length) {
      updateStatus("No audio generated.");
      return;
    }
    lastSynthEnd = performance.now();
    setPerf(perfSynthesize, "Synthesis", lastSynthEnd - synthStart);
    for (const msg of audioMessages) {
      await playWithVisemes(msg.data);
    }
    return;
  }

  updateStatus("TTS unavailable.");
}

if (speakBtn) {
  speakBtn.addEventListener("click", async () => {
    const text = textInput?.value?.trim();
    if (!text) {
      updateStatus("Type something to speak.");
      return;
    }
    speakBtn.disabled = true;
    await speakText(text);
    speakBtn.disabled = false;
  });
}

updateStatus("TTS idle");

// Preload TTS on load to reduce first-speak latency (Chrome/WebGPU).
window.addEventListener("load", () => {
  ensureTtsReady();
});
