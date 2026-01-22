import { HeadTTS } from "./vendor/headtts/headtts.mjs";

const ttsStatus = document.getElementById("ttsStatus");
const speakBtn = document.getElementById("speakBtn");
const textInput = document.getElementById("ttsInput");
const perfInit = document.getElementById("perfInit");
const perfSynthesize = document.getElementById("perfSynthesize");
const perfAudio = document.getElementById("perfAudio");

let tts = null;
let ttsReady = false;
let ttsConnecting = false;
let currentAudio = null;
let currentUrl = null;
let rafId = null;
let audioCtx = null;

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
    await tts.connect(null, (progress) => updateStatus(formatProgress(progress)));
    await tts.setup({
      voice: "am_eric",
      language: "en-us",
      speed: 1,
      audioEncoding: "wav",
    });
    ttsReady = true;
    updateStatus("TTS ready");
    setPerf(perfInit, "Init", performance.now() - initStart);
  } catch (error) {
    console.error(error);
    updateStatus("TTS failed to initialize. Check console.");
    setPerf(perfInit, "Init", performance.now() - initStart);
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

function scheduleVisemes(getTimeMs, audioEndCallback) {
  const visemes = audioEndCallback.visemes || [];
  const vtimes = audioEndCallback.vtimes || [];
  const vdurations = audioEndCallback.vdurations || [];
  let index = 0;

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
    if (window.aidenVisemeDriver) {
      window.aidenVisemeDriver.setViseme(viseme, 1);
    }
    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);
}

async function playWithVisemes(audioData) {
  stopCurrentPlayback();

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

  const audioStart = performance.now();
  setPerf(perfAudio, "Audio", null);

  return new Promise((resolve) => {
    if (audioBuffer) {
      const playDecoded = (decoded) => {
        const source = context.createBufferSource();
        source.buffer = decoded;
          source.connect(context.destination);
          const startTime = context.currentTime + 0.01;
          source.start(startTime);
          updateStatus("Speaking...");

          scheduleVisemes(
            () => (context.currentTime - startTime) * 1000,
            payload
          );

          source.onended = () => {
            stopCurrentPlayback();
            updateStatus("TTS idle");
            setPerf(perfAudio, "Audio", performance.now() - audioStart);
            resolve();
          };
      };

      if (audioBuffer instanceof AudioBuffer) {
        playDecoded(audioBuffer);
      } else {
        context
          .decodeAudioData(audioBuffer.slice(0))
          .then(playDecoded)
          .catch((error) => {
            console.error(error);
            updateStatus("Audio decode failed. Falling back.");
            fallbackToHtmlAudio(audioBuffer, payload, resolve, audioStart);
          });
      }
    } else {
      fallbackToHtmlAudio(audioBuffer, payload, resolve, audioStart);
    }
  });
}

function fallbackToHtmlAudio(audioBuffer, payload, resolve, audioStart) {
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
    scheduleVisemes(() => audio.currentTime * 1000, payload);
  });

  audio.addEventListener("ended", () => {
    stopCurrentPlayback();
    updateStatus("TTS idle");
    setPerf(perfAudio, "Audio", performance.now() - audioStart);
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
    setPerf(perfAudio, "Audio", performance.now() - audioStart);
    resolve();
  });
}

async function speakText(text) {
  await ensureTtsReady();
  if (ttsReady && tts) {
    const synthStart = performance.now();
    setPerf(perfSynthesize, "Synthesize", null);
    const messages = await tts.synthesize({ input: text });
    const audioMessages = (messages || []).filter((msg) => msg.type === "audio");
    if (!audioMessages.length) {
      updateStatus("No audio generated.");
      return;
    }
    setPerf(perfSynthesize, "Synthesize", performance.now() - synthStart);
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
