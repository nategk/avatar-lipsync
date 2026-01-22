# Avatar Lipsync Technical Spike

## Goal
Evaluate the lowest possible latency from text-to-speech (TTS) to 3D lipsync
animation in a browser. The spike answers where each stage should run (server
vs client) to minimize perceived latency while keeping the system reliable.

## Non-goal
Animation or 3D model quality. They're just quick references made for testing the pipeline. If latency is promising, we'll make a quality model with animation.

## Setup
- Install dependencies: `npm install`
- Build assets: `npm run build`
- Build + run server: `npm run dev`
- Or run server only: `npm run start` (assumes assets already built)

Open:
- `http://localhost:8000/index.html` for realtime lipsync evaluation
- `http://localhost:8000/aiden-modeler.html` for model evaluation

## Architecture (High Level)
- Browser renders the Aiden 3D model and applies viseme-driven morph targets.
- HeadTTS runs in the browser (WebGPU/WASM) to generate audio + viseme timings.
- Audio plays in the browser while visemes drive mouth/eyebrow animation.
- A local static server hosts all assets (models, wasm, JS bundles).

## Core Technologies
- Three.js for 3D rendering
- HeadTTS for TTS + viseme data
- Web Audio API for playback timing
- WebGPU/WASM via onnxruntime-web + transformers.js
- http-server for local static hosting

## Server vs Client Responsibilities
Client-side (current spike):
- TTS inference (HeadTTS) for lowest latency and zero network round-trip
- Viseme scheduling and animation updates
- Audio playback and sync with 3D model
- Model rendering (Three.js)

Server-side (potential production path):
- Optional TTS inference when client devices are weak or constrained
- Asset hosting (models, wasm, JS bundles)
- Telemetry or quality metrics (latency, dropped frames)

Guiding principle:
- Keep inference on-client for minimum latency when hardware allows.
- Fall back to server inference when client performance is insufficient.
