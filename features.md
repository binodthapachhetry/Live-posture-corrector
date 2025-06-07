# 🚀 Feature Backlog & Atomic Tasks  
_Use GitHub “Issues” for each top-level feature; copy the subtasks into issue check-lists.  
Label epics with `enhancement`, per-task labels noted in brackets._

---

## 1. Off-load Inference to Web Worker ★★★  
**Goal:** isolate heavy TF.js ops, improve UI responsiveness, surface perf metrics.  
**Issue Labels:** `performance`, `architecture`

- [ ] 1.1 Create `src/workers/postureWorker.ts` (initialize tfjs-wasm, load model, expose `detectPose` + `analyzePosture` via Comlink).  
- [ ] 1.2 Refactor `PostureDetectionService` to proxy all calls to the worker.  
- [ ] 1.3 Add `PerfMetrics` type and post `{load, infer, analyse, fps}` back to main thread.  
- [ ] 1.4 Implement `PerfService` that buffers last N metrics and exposes `getAverages()`.  
- [ ] 1.5 Overlay live FPS/latency in `CameraFeed` (toggle via DebugContext).

---

## 2. Flexible Model Backend (TFJS / ONNX) ★★  
**Goal:** showcase multi-framework expertise, enable MXNet→ONNX models.  
**Issue Labels:** `ml-framework`, `scalability`

- [ ] 2.1 Add `Backend` enum and `ModelFactory` util that returns a uniform detector interface.  
- [ ] 2.2 Integrate ONNX-Runtime-Web; lazy-load when backend === ONNX.  
- [ ] 2.3 Expose build-time flag (`process.env.BACKEND`) via vite config.  
- [ ] 2.4 Document benchmark matrix (FPS, latency) for both backends.

---

## 3. ST-GCN Posture Classifier ★★★  
**Goal:** replace geometric heuristics with sequence-aware deep model.  
**Issue Labels:** `algorithm`, `deep-learning`

- [ ] 3.1 Convert a pre-trained ST-GCN to ONNX (`public/models/stgcn.onnx`).  
- [ ] 3.2 Implement `PostureClassifier` service (loads model, consumes 48-frame ring-buffer, outputs `{status, confidence}`).  
- [ ] 3.3 Maintain sliding pose buffer in `CameraFeed`; call classifier every N frames.  
- [ ] 3.4 Update `NotificationService` to use confidence gating (`conf ≥ 0.6`).  
- [ ] 3.5 A/B toggle between heuristic and ST-GCN in settings.

---

## 4. IMU Sensor-Fusion & DSP Showcase ★★  
**Goal:** demonstrate DSP + edge-sensor integration skills.  
**Issue Labels:** `dsp`, `iot`

- [ ] 4.1 Create `IMUService` (Web Bluetooth, quaternion stream).  
- [ ] 4.2 Implement `FusionService` (Kalman filter neck angle = IMU ⊕ head-pose).  
- [ ] 4.3 Extend `PostureOverlay` to colour neck line when fused angle > threshold.  
- [ ] 4.4 Permission & reconnect UI flow.

---

## 5. Edge / Embedded Deployment Path ★★  
**Goal:** prove edge-device experience (e.g., Raspberry Pi 4).  
**Issue Labels:** `edge`, `deployment`

- [ ] 5.1 Add `docker/raspi/Dockerfile` with `@tensorflow/tfjs-node`.  
- [ ] 5.2 Provide `docs/raspi_setup.md` (hardware acc. flags, swap size).  
- [ ] 5.3 Record benchmark numbers in `docs/perf_benchmarks.md`.

---

## 6. Reinforcement-Learning Personalised Thresholding ★★  
**Goal:** adaptive feedback cadence tuned per user.  
**Issue Labels:** `rl`, `personalization`

- [ ] 6.1 Implement lightweight bandit agent (`ThresholdAgent.ts`).  
- [ ] 6.2 Reward = user corrects posture within 5 s after alert.  
- [ ] 6.3 Persist agent state in `localStorage`; reset via Settings.  
- [ ] 6.4 Visualise learnt threshold in Debug overlay.

---

## 7. Debug & Profiling Tooling ★  
**Goal:** easy toggles for dev/test; surface system health.  
**Issue Labels:** `dev-tools`

- [ ] 7.1 Introduce `DebugContext` + provider (global on/off).  
- [ ] 7.2 Add key-combo (e.g., **D** + **P**) to toggle overlay.  
- [ ] 7.3 Render IMU traces, perf charts, model backend info.

---

## 8. Documentation & Diagrams ★  
**Goal:** satisfy hiring-manager emphasis on system understanding & scalability.  
**Issue Labels:** `documentation`

- [ ] 8.1 `docs/architecture.md` – sequence diagrams, worker/main threading model.  
- [ ] 8.2 `docs/perf_benchmarks.md` – metrics table per backend/device.  
- [ ] 8.3 Update README with new build flags, edge deployment guide.

---
