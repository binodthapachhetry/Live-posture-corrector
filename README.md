# Posture Corrector (React + TensorFlow.js)

## TL;DR
```bash
git clone <repo-url> posture-corrector && cd posture-corrector/react_app
npm i
npm run dev            # opens http://localhost:5173
```

## What It Does
Real-time webcam posture analysis running **entirely in the browser**  
• MoveNet pose detection (TensorFlow.js)  
• Per-user calibration for accuracy  
• Visual overlay + Web Notifications (cross-tab cooldown)  
• No server, no data leaves your machine

## Why It’s Interesting
| Area | Detail |
|------|--------|
| **AI/ML** | MoveNet + geometric heuristics for slouch & shoulder alignment |
| **UX** | Guided calibration modal, canvas overlay, configurable alerts |
| **PWA** | Service-Worker enables background notifications |
| **DX** | Vite, strict TypeScript, ESLint, Jest |

## Getting Started
### 0. Prerequisites  
Node ≥ 18, modern browser (Chrome 113+ recommended).

### 1. Install & Run
```bash
cd react_app
npm i
npm run dev
```

### 2. Production Build
```bash
npm run build          # outputs static assets to dist/
```

### 3. Tests
```bash
npm run test           # jest + ts-jest
```

## Repo Layout
```
react_app/
 ├─ src/
 │  ├─ components/      # UI (CameraFeed, CalibrationModal …)
 │  ├─ services/        # Core logic (PostureDetectionService …)
 │  ├─ types/           # Shared TS types
 │  └─ utils/           # Helper libs
 ├─ public/             # PWA assets (service-worker.js)
 └─ vite.config.ts      # Vite setup
```

## Technical Highlights
### 1. PostureDetectionService
* Loads MoveNet on-demand, caches model  
* Adaptive thresholds from user calibration stored in `localStorage`  
* Runs ~30 FPS on laptop hardware

### 2. NotificationService
* Permission flow + user-defined cooldown  
* `BroadcastChannel` prevents multi-tab spam  
* Works in background via Service-Worker

## Privacy
All processing happens **locally in the browser**.  
No frames are ever sent to any server.

## Screenshots / Demo
Add `docs/demo.gif` and reference it here:  
```md
![demo](docs/demo.gif)
```

## Roadmap / Nice-to-Haves
- Mobile layout tuning  
- Trend analytics export (CSV)  
- Smoothing filter (OneEuro)

## License
MIT – see `LICENSE`.

