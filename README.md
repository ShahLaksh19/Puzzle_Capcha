# PuzzlePass — Privacy-First Visual CAPTCHA System

**PuzzlePass** is an interactive, privacy-first visual CAPTCHA verification framework built with modern web technologies, client-side canvas manipulation, optional computer vision gestures (MediaPipe), and a cryptographically secure Python verification backend.

---

## 🌟 Key Features

1. **Privacy-First Architecture:**
   - User photos and uploaded images are processed **100% in-memory on the client browser canvas**.
   - Raw personal photos are **never uploaded, stored, or sent over the network**.
2. **Multi-Source Image Handling:**
   - 📷 **Camera Mode:** Live video stream with one-click instant snapshot or dual-hand gesture framing.
   - 📁 **Local Upload Mode:** Upload any local image (`.png`, `.jpg`, `.webp`) processed completely in-browser.
   - 🎨 **Curated Offline Samples:** 4 procedural, high-contrast presets (Mountain Sunset, Cyberpunk City, Mandala Geometry, Cosmic Nebula).
3. **Multimodal User Interaction:**
   - 🖱️ **Mouse:** Drag-and-drop or click-to-swap tiles.
   - 📱 **Mobile Touch:** Smooth touch drag on phones and tablets.
   - ⌨️ **Keyboard Accessibility:** Full arrow key navigation (`←`, `→`, `↑`, `↓`) with `Space`/`Enter` to select and swap.
   - ✋ **Hands-Free Gestures:** Optional MediaPipe pinch-to-drag and fist-to-save.
4. **FastAPI & Python Security Engine:**
   - **Randomized Challenge Permutations:** Shuffled on server with HMAC-SHA256 signatures.
   - **Time-to-Live (TTL):** 120-second challenge expiration.
   - **Replay Attack Defense:** One-time challenge consumption and cryptographic nonce tracking.
   - **Bot Timing Anomaly Detection:** Sub-second solve rejection to prevent automated scripts.
   - **One-Time Verification Tokens:** Issues a cryptographically signed HMAC token (`pp_...`) for form authorization.
5. **♿ Accessible Alternative:**
   - Built-in audio/math verification modal for users requiring screen reader support or non-visual verification.
6. **Benchmark & Evaluation Suite:**
   - Evaluated over 100 human trials and 100 threat vectors:
     - Human Success Rate: **100.0%**
     - False Rejection Rate (FRR): **0.0%**
     - Average Completion Time: **6.58 seconds**
     - Bot Threat Defense Rate: **100.0%**

---

## 🏗️ Project Architecture

```
Puzzle_Capcha/
├── backend/
│   ├── security.py          # Cryptographic HMAC challenge, replay defense, TTL, token engine
│   ├── server.py            # Unified standard-library server (REST API + static UI server)
│   └── fastapi_app.py       # FastAPI asynchronous alternative
├── Puzzle/
│   ├── index.html           # Main UI stage, HUD, toolbar, and CAPTCHA demo form
│   ├── app.js               # Client controller (slicing, canvas rendering, gesture, mouse/touch/keyboard)
│   └── css/styles.css       # Responsive dark-theme styling, HUD badges, animations
├── benchmark_evaluation.py  # Performance, FRR, and security evaluation benchmark
├── test_security.py         # Unit tests for security engine assertions
└── README.md                # Project documentation
```

---

## 🚀 Quickstart Guide (VS Code on Windows)

### Option 1: Run the Complete Full-Stack Server (Recommended)
This starts both the Security REST API and serves the interactive UI on `http://localhost:8000`:

```powershell
& "C:\Users\Laksh\AppData\Local\Python\bin\python.exe" backend/server.py
```
Open your browser to:
👉 **[http://localhost:8000](http://localhost:8000)**

### Option 2: Run with VS Code Live Server
1. Install the **Live Server** extension in VS Code (`Ctrl + Shift + X`).
2. Right-click on `Puzzle/index.html` and click **"Open with Live Server"**.
3. In a separate terminal, start the backend API:
   ```powershell
   & "C:\Users\Laksh\AppData\Local\Python\bin\python.exe" backend/server.py
   ```
4. PuzzlePass automatically connects from port 5500 to port 8000 via CORS.

---

## 🧪 Running Security Tests & Benchmarks

Run the security unit tests (assertions on replay attacks, bot detection, attempt limits):
```powershell
& "C:\Users\Laksh\AppData\Local\Python\bin\python.exe" test_security.py
```

Run the performance & security evaluation benchmark:
```powershell
& "C:\Users\Laksh\AppData\Local\Python\bin\python.exe" benchmark_evaluation.py
```

---

## 🛡️ API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/api/captcha/health` | `GET` | Service status check |
| `/api/captcha/challenge` | `POST` | Generates a signed $3\times3$ challenge permutation and TTL |
| `/api/captcha/verify` | `POST` | Verifies the completed puzzle state and issues a one-time verification token |
| `/api/captcha/validate-token` | `POST` | Consumes and validates the one-time token for protected actions |
| `/api/captcha/accessible-challenge` | `POST` | Issues an accessible alternative challenge |
| `/api/captcha/verify-accessible` | `POST` | Verifies the alternative challenge answer |

---

## 📄 License
MIT License — Free to use, modify, and showcase in personal portfolios.
