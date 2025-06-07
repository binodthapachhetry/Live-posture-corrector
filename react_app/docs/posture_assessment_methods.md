# Pros and Cons of Eight Alternative Posture-Assessment Techniques

## 1. Spatio-Temporal Graph CNNs (ST-GCN & successors)
**Pros**
- Explicitly encodes joint-to-joint & frame-to-frame dynamics → catches multi-joint slouch patterns.
- Moderate model size (≤1-2 MB) – feasible with TF.js / ONNX-Web.
- Pre-trained weights & open-source repos widely available.
- Graph structure is interpretable, easy to add domain edges (e.g., left-ear ↔ nose).

**Cons**
- Needs labelled pose-sequence data (not single frames).
- Still quadratic in #frames for long clips → may require sliding window.
- JS port needs custom WebGL ops for graph conv kernels.
- Sensitive to missing joints unless masked during training.

---

## 2. Transformer-based Skeleton Encoders (PoseFormer, TokenPose)
**Pros**
- Global self-attention captures long-range posture drift (minutes).
- No handcrafted graph; automatically learns inter-joint relations.
- Scales from <1 s to >10 s sequences by adjusting window.

**Cons**
- Memory/compute heavy (O(N²) attention) – mobile browsers may drop frames.
- Requires large training corpus to avoid overfitting.
- Harder to interpret which joints drive the decision.
- WebGPU/WebAssembly often needed for real-time speed.

---

## 3. Self-Supervised Contrastive Learning on Skeletons
**Pros**
- Slashes labelling cost – can pre-train on hours of unlabelled webcam data.
- Learns robust, transferable posture embeddings.
- Fine-tuning to “good / bad” needs only a few minutes of annotated clips.

**Cons**
- Pre-training pipeline is compute-intensive (GPU cluster).
- Choosing augmentation suite for skeletons is non-trivial.
- Adds extra model-distillation / fine-tune step before deployment.
- Final classifier still needed on top of embeddings.

---

## 4. Sequence Autoencoder / VAE Anomaly Detection
**Pros**
- Train solely on “GOOD” posture – avoids enumerating every bad pose.
- Outputs a continuous “quality score” instead of binary label.
- Lightweight LSTM/GRU versions (<500 k params) run 60 FPS in browser.
- Naturally personalisable: re-train quickly on user’s good samples.

**Cons**
- High false-positive risk for rare but legitimate postures.
- Requires threshold tuning per user/environment.
- Detects “different” not necessarily “ergonomically bad”.
- Model drift if good-posture reference degrades over time.

---

## 5. Temporal Bayesian / Kalman Filtering over Heuristic Metrics
**Pros**
- Tiny CPU footprint; no NN required.
- Smooths detector jitter; enforces plausible posture-change speed.
- Completely interpretable; easy to debug.
- Can wrap around existing angle-based features – minimal refactor.

**Cons**
- Doesn’t learn new patterns—only filters noise.
- Parameter tuning (process / measurement noise) can be fiddly.
- Adds latency proportional to filter window.
- Still inherits limitations of underlying geometric metrics.

---

## 6. 2-D→3-D Pose Lifting + Biomechanical Metrics (VideoPose3D, METRO)
**Pros**
- Camera-angle invariant—forward lean vs. perspective distortion is separable.
- Enables clinical angles: lumbar lordosis, pelvic tilt, etc.
- Rich feedback (“lower back over-arched”) beyond shoulder/ear cues.
- Many off-the-shelf pretrained weights.

**Cons**
- 3-D lifting adds ~4-8 ms per frame; web deployment may drop below 30 FPS.
- Accuracy degrades with occluded lower body (common in webcam).
- Integration complexity: extra coordinate systems, mesh visualisation.
- Larger WASM bundle (~5-10 MB) and higher GPU RAM use.

---

## 7. Multimodal RGB + Skeleton Vision Transformers
**Pros**
- Combines pixel texture & sparse keypoint signals; recovers from missing joints.
- Can leverage CLIP/ViT pre-training → data efficiency.
- End-to-end differentiable; jointly optimises detection & classification.

**Cons**
- Very large (tens of MB); WebGL memory pressure.
- Training demands significant multimodal dataset.
- Hard to interpret attention maps for UX feedback.
- Browser-side cross-origin image tensor creation may hit security limits.

---

## 8. Reinforcement-Learning–Driven Personalised Thresholding
**Pros**
- Online adapts to each user’s ergonomics and tolerance for alerts.
- Simple multi-armed bandit versions need minimal compute.
- Reduces false-positive fatigue by learning optimal notification cadence.
- Works on top of any posture-quality signal (heuristic or NN).

**Cons**
- Needs a reliable reward signal (e.g., webcam detects correction).
- Cold-start phase may annoy users with exploratory alerts.
- Convergence speed depends on user interaction frequency.
- Extra governance concerns (ethics, personalised data retention).
