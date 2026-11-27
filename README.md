# PuzzlePass — Privacy-First Visual CAPTCHA System

**PuzzlePass** is an interactive, privacy-focused visual CAPTCHA verification system that provides secure and accessible human verification through an interactive 3×3 image puzzle.

Built using HTML, CSS, JavaScript, Python, FastAPI, and cryptographic security mechanisms, it combines client-side image processing with server-side challenge verification to protect user privacy while preventing automated bot attacks.

## 🌟 Key Features

### 1. Privacy-First Architecture
- Processes uploaded and captured images entirely within the browser using HTML Canvas.
- Raw personal images are never uploaded to or stored on the backend.
- Keeps image processing client-side to protect user privacy.

### 2. Multiple Image Sources
- **Camera Mode:** Capture images instantly using a live camera feed.
- **Local Upload:** Upload PNG, JPG, and WEBP images directly from your device.
- **Offline Samples:** Includes four built-in procedural image presets:
  - Mountain Sunset
  - Cyberpunk City
  - Mandala Geometry
  - Cosmic Nebula

### 3. Multiple Interaction Methods
- **Mouse:** Drag-and-drop or click-to-swap puzzle tiles.
- **Touch:** Mobile-friendly interaction for phones and tablets.
- **Keyboard:** Arrow-key navigation with Space and Enter support.
- **Hand Gestures:** Optional MediaPipe integration for pinch-to-drag and fist-to-save interactions.

### 4. Python-Based Security Engine
- Randomized 3×3 puzzle challenge generation.
- HMAC-SHA256 signatures for challenge integrity.
- 120-second challenge expiration (TTL).
- Replay attack protection through one-time challenge consumption.
- Bot timing anomaly detection.
- Cryptographically signed, one-time verification tokens.
- FastAPI-based asynchronous backend option.

### 5. Accessible Verification
- Provides an alternative audio/math verification challenge.
- Supports users who require a non-visual verification method.
- Includes keyboard-based puzzle navigation.

### 6. Benchmark and Evaluation
Evaluated using 100 human trials and 100 threat vectors.

| Evaluation Metric | Reported Result |
|---|---:|
| Human Success Rate | 100.0% |
| False Rejection Rate (FRR) | 0.0% |
| Average Completion Time | 6.58 seconds |
| Bot Threat Defense Rate | 100.0% |

*Results are from the project's benchmark evaluation and are dependent on the test conditions and threat scenarios used.*

---

## 🏗️ Project Architecture

```text
Puzzle_Capcha/
│
├── backend/
│   ├── security.py
│   ├── server.py
│   └── fastapi_app.py
│
├── Puzzle/
│   ├── index.html
│   ├── app.js
│   └── css/
│       └── styles.css
│
├── benchmark_evaluation.py
├── test_security.py
└── README.md
```

### Main Components

- **security.py:** Handles HMAC signatures, challenge validation, replay protection, TTL, and verification tokens.
- **server.py:** Runs the REST API and serves the frontend using a standard-library server.
- **fastapi_app.py:** Provides an asynchronous FastAPI backend alternative.
- **index.html:** Contains the main CAPTCHA interface.
- **app.js:** Handles image processing, puzzle generation, tile interactions, and gesture controls.
- **styles.css:** Provides responsive styling and UI animations.
- **benchmark_evaluation.py:** Evaluates performance and security metrics.
- **test_security.py:** Contains security-related unit tests.

---

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.10 or later (depending on installed dependencies).
- Visual Studio Code.
- Google Chrome or another modern browser.
- Git (optional, for cloning the repository).

### Step 1: Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Puzzle_Capcha
```

### Step 2: Install Dependencies

If your project contains a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

Install the dependencies required by your selected backend if they are not already included.

### Step 3: Start the Backend

**Option 1 — Complete server (recommended for local testing)**

```bash
python backend/server.py
```

Open your browser at:

```text
http://localhost:8000
```

**Option 2 — FastAPI backend**

If using the FastAPI application:

```bash
pip install fastapi uvicorn
uvicorn backend.fastapi_app:app --host 127.0.0.1 --port 8000
```

Use this option only if the FastAPI application exposes an `app` object and is configured to serve or connect to your frontend.

---

## 🧪 Testing and Evaluation

### Run Security Tests

```bash
python test_security.py
```

Tests cover security mechanisms such as:
- Challenge validation.
- Replay attack prevention.
- Bot timing detection.
- Attempt restrictions.

### Run Performance Benchmarks

```bash
python benchmark_evaluation.py
```

Evaluates human verification performance, completion time, false rejection rate, and bot threat detection.

---

## 🔌 API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/api/captcha/health` | GET | Checks backend service status. |
| `/api/captcha/challenge` | POST | Generates a signed 3×3 CAPTCHA challenge. |
| `/api/captcha/verify` | POST | Verifies the completed puzzle. |
| `/api/captcha/validate-token` | POST | Validates and consumes a one-time token. |
| `/api/captcha/accessible-challenge` | POST | Generates an alternative accessible challenge. |
| `/api/captcha/verify-accessible` | POST | Verifies the accessible challenge response. |

---

## 🌐 Deployment

PuzzlePass can be deployed using:
- **GitHub:** Source code and version control.
- **Render:** Hosting the Python backend and, if configured, the complete application.
- **GitHub Pages:** Hosting the static frontend separately.

GitHub Pages does not execute Python backend code. The frontend must therefore be configured to communicate with the deployed backend API.

---

## 🔐 Privacy and Security

PuzzlePass is designed around client-side image processing and server-side cryptographic verification.

- Personal images remain within the browser during image processing.
- Challenge integrity is protected using HMAC-SHA256.
- Challenge expiration and one-time consumption reduce replay risks.
- Verification tokens help protect authorized form submissions.

---

## 📜 License

This project is released under the **MIT License**. See the `LICENSE` file for details.

---

**PuzzlePass — Making Human Verification More Private, Accessible, and Secure.**
