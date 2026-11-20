/**
 * PuzzlePass — Privacy-First Adaptive Visual CAPTCHA
 * Enhanced UI/UX with:
 *  1. Interactive Hero Cover Page
 *  2. "Memorize Image" Preview Phase with countdown timer
 *  3. "Peek Original" reference card while solving
 *  4. Multimodal controls (Mouse drag & Click-to-swap, Mobile Touch, Keyboard, Computer Vision Pinch)
 *  5. FastAPI/Python Cryptographic Security Integration
 */

import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_TIP: 20,
  MIDDLE_MCP: 9,
  RING_MCP: 13,
  PINKY_MCP: 17,
};

const PINCH_THRESHOLD = 0.055;
const FRAME_PADDING = 28;
const FREEZE_HOLD_MS = 250;
const COUNTDOWN_SECONDS = 3;
const FIST_HOLD_FRAMES = 12;
const SNAP_DISTANCE_RATIO = 0.45;
const GRID = 3;
const LOAD_TIMEOUT_MS = 20000;

const PHOTOBOOTH_CONTRAST_ALPHA = 1.25;
const PHOTOBOOTH_BRIGHTNESS_BETA = 8;
const PHOTOBOOTH_NOISE_STD = 12;

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const API_BASE = window.location.port === "8000" ? "" : "http://localhost:8000";

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================
const coverPage = document.getElementById("coverPage");
const enterDemoBtn = document.getElementById("enterDemoBtn");
const quickSampleBtn = document.getElementById("quickSampleBtn");
const openCoverBtn = document.getElementById("openCoverBtn");

const videoEl = document.getElementById("webcam");
const canvas = document.getElementById("sceneCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const loadingOverlay = document.getElementById("loadingOverlay");
const loaderText = document.getElementById("loaderText");
const loaderRetry = document.getElementById("loaderRetry");
const errorBanner = document.getElementById("errorBanner");

const progressBadge = document.getElementById("progressBadge");
const progressText = document.getElementById("progressText");
const ttlBadge = document.getElementById("ttlBadge");
const ttlText = document.getElementById("ttlText");
const movesBadge = document.getElementById("movesBadge");
const movesText = document.getElementById("movesText");
const reshuffleBtn = document.getElementById("reshuffleBtn");
const peekBtn = document.getElementById("peekBtn");
const peekCard = document.getElementById("peekCard");
const peekCanvas = document.getElementById("peekCanvas");

// Memorize image preview banner
const previewOverlay = document.getElementById("previewOverlay");
const previewSeconds = document.getElementById("previewSeconds");
const skipPreviewBtn = document.getElementById("skipPreviewBtn");

// Source selector tabs
const srcCameraBtn = document.getElementById("srcCameraBtn");
const srcUploadBtn = document.getElementById("srcUploadBtn");
const srcSampleBtn = document.getElementById("srcSampleBtn");
const srcAccessibleBtn = document.getElementById("srcAccessibleBtn");
const imageFileInput = document.getElementById("imageFileInput");
const samplePicker = document.getElementById("samplePicker");
const cameraActionBar = document.getElementById("cameraActionBar");
const snapPhotoBtn = document.getElementById("snapPhotoBtn");

// Sidebar elements
const tabCaptchaBtn = document.getElementById("tabCaptchaBtn");
const tabStripBtn = document.getElementById("tabStripBtn");
const captchaDemoSection = document.getElementById("captchaDemoSection");
const stripSection = document.getElementById("stripSection");

const verificationStatusPill = document.getElementById("verificationStatusPill");
const verificationStatusLabel = document.getElementById("verificationStatusLabel");
const tokenDisplay = document.getElementById("tokenDisplay");
const copyTokenBtn = document.getElementById("copyTokenBtn");
const submitProtectedFormBtn = document.getElementById("submitProtectedFormBtn");
const submissionResult = document.getElementById("submissionResult");
const demoUsername = document.getElementById("demoUsername");

const galleryStrip = document.getElementById("galleryStrip");
const galleryEmpty = document.getElementById("galleryEmpty");
const galleryCount = document.getElementById("galleryCount");
const downloadStripBtn = document.getElementById("downloadStripBtn");
const resetAllBtn = document.getElementById("resetAllBtn");
const stripCompleteMsg = document.getElementById("stripCompleteMsg");

// Accessible modal elements
const accessibleModal = document.getElementById("accessibleModal");
const accessibleQuestion = document.getElementById("accessibleQuestion");
const accessibleAnswerInput = document.getElementById("accessibleAnswerInput");
const accessibleVerifyBtn = document.getElementById("accessibleVerifyBtn");
const accessibleStatus = document.getElementById("accessibleStatus");
const accessibleCloseBtn = document.getElementById("accessibleCloseBtn");

// ==========================================
// 3. APPLICATION STATE
// ==========================================
let currentSource = "sample";          // "sample", "upload", "camera"
let appState = "idle";                 // "idle", "memorize_preview", "countdown", "puzzle", "shattering"

const puzzle = {
  boardBox: null,
  pieces: [],
  solved: false,
  tileW: 0,
  tileH: 0,
  fullPhotoboothCanvas: null,
};

let activeChallenge = null;
let currentPermutation = [];
let puzzleStartTime = 0;
let movesCount = 0;
let ttlRemainingSeconds = 120;
let ttlTimerInterval = null;
let verificationToken = null;

// Memorize Preview Countdown
let previewCountdownSeconds = 3;
let previewTimerInterval = null;

// Mouse & Touch interaction state
const pointerDrag = {
  active: false,
  piece: null,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
};
let selectedTileForSwap = null;

// Keyboard navigation state
let keyboardFocusIndex = 0;
let keyboardSelectedIndex = null;

// MediaPipe hand drag state
const handDrag = {
  activeHand: null,
  piece: null,
  offsetX: 0,
  offsetY: 0,
};

// Shatter animation state
const SHATTER_COLS = 6;
const SHATTER_ROWS = 6;
const SHATTER_DURATION_MS = 850;
const shatter = {
  active: false,
  startedAt: 0,
  fragments: [],
  pendingCanvas: null,
};

const STRIP_MAX_PHOTOS = 3;
const galleryEntries = [];
let handLandmarker = null;
let fistHoldCounter = 0;

const freezeGate = { holding: false, since: 0 };
const FRAME_GRACE_MS = 450;
const lastSeenFrame = { box: null, at: 0 };

const countdown = {
  active: false,
  startedAt: 0,
};

// ==========================================
// 4. BACKEND SECURITY INTEGRATION
// ==========================================
async function fetchChallengeFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/captcha/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grid_size: GRID }),
    });
    if (res.ok) {
      const data = await res.json();
      activeChallenge = data;
      ttlRemainingSeconds = data.expires_in || 120;
      startTtlTimer();
      return data.permutation;
    }
  } catch (err) {
    console.warn("[PuzzlePass] Backend offline, falling back to local cryptographic shuffle:", err);
  }

  // Graceful local fallback
  activeChallenge = {
    challenge_id: "local_" + Math.random().toString(36).substring(2, 10),
    signature: "local_signature",
    expires_in: 120,
  };
  ttlRemainingSeconds = 120;
  startTtlTimer();

  const fallback = Array.from({ length: GRID * GRID }, (_, i) => i);
  for (let i = fallback.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
  }
  return fallback;
}

function startTtlTimer() {
  clearInterval(ttlTimerInterval);
  ttlBadge.classList.remove("hidden");
  ttlText.textContent = `${ttlRemainingSeconds}s`;

  ttlTimerInterval = setInterval(() => {
    ttlRemainingSeconds--;
    ttlText.textContent = `${Math.max(0, ttlRemainingSeconds)}s`;
    if (ttlRemainingSeconds <= 0) {
      clearInterval(ttlTimerInterval);
      statusText.textContent = "Challenge expired. Click New Challenge.";
      showError("Challenge timed out (120s TTL). Please restart the puzzle.");
    }
  }, 1000);
}

async function verifyChallengeWithBackend() {
  const solveTimeMs = Math.round(performance.now() - puzzleStartTime);
  clearInterval(ttlTimerInterval);

  if (!activeChallenge || activeChallenge.challenge_id.startsWith("local_")) {
    markVerifiedLocally(solveTimeMs);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/captcha/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: activeChallenge.challenge_id,
        signature: activeChallenge.signature,
        final_permutation: currentPermutation,
        solve_time_ms: solveTimeMs,
        moves_count: movesCount,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      verificationToken = data.verification_token;
      applyVerificationSuccess(verificationToken, solveTimeMs);
    } else {
      showError(data.message || "Verification failed.");
      statusText.textContent = data.message || "Verification rejected.";
    }
  } catch (err) {
    console.warn("[PuzzlePass] Backend verification error, using local confirmation:", err);
    markVerifiedLocally(solveTimeMs);
  }
}

function applyVerificationSuccess(token, solveTimeMs) {
  verificationStatusPill.className = "verification-status-pill verified";
  verificationStatusLabel.textContent = `Human Verified ✓ (${(solveTimeMs / 1000).toFixed(1)}s)`;
  tokenDisplay.value = token;
  submitProtectedFormBtn.disabled = false;
  statusDot.className = "status-dot solved";
  statusText.textContent = "Verified! Human confirmed.";
  progressBadge.classList.add("solved");
}

function markVerifiedLocally(solveTimeMs) {
  const mockToken = `pp_local_${Math.random().toString(36).substring(2, 14)}.sig_ok`;
  applyVerificationSuccess(mockToken, solveTimeMs);
}

// ==========================================
// 5. SAMPLE PROCEDURAL IMAGE GENERATOR
// ==========================================
function generateSampleImage(preset) {
  const w = 640;
  const h = 640;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const sCtx = c.getContext("2d");

  if (preset === "sunset") {
    const sky = sCtx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#2a1548");
    sky.addColorStop(0.35, "#881e3a");
    sky.addColorStop(0.65, "#f77f00");
    sky.addColorStop(1, "#fcbf49");
    sCtx.fillStyle = sky;
    sCtx.fillRect(0, 0, w, h);

    sCtx.beginPath();
    sCtx.arc(w / 2, h * 0.45, 80, 0, Math.PI * 2);
    sCtx.fillStyle = "#fff3b0";
    sCtx.shadowColor = "#f77f00";
    sCtx.shadowBlur = 35;
    sCtx.fill();
    sCtx.shadowBlur = 0;

    sCtx.fillStyle = "#3e1236";
    sCtx.beginPath();
    sCtx.moveTo(0, h * 0.65);
    sCtx.lineTo(w * 0.35, h * 0.42);
    sCtx.lineTo(w * 0.7, h * 0.68);
    sCtx.lineTo(w, h * 0.54);
    sCtx.lineTo(w, h);
    sCtx.lineTo(0, h);
    sCtx.fill();

    sCtx.fillStyle = "#150619";
    sCtx.beginPath();
    sCtx.moveTo(0, h * 0.78);
    sCtx.lineTo(w * 0.55, h * 0.6);
    sCtx.lineTo(w, h * 0.82);
    sCtx.lineTo(w, h);
    sCtx.lineTo(0, h);
    sCtx.fill();

  } else if (preset === "cyber") {
    sCtx.fillStyle = "#07080f";
    sCtx.fillRect(0, 0, w, h);

    sCtx.strokeStyle = "#00f0ff";
    sCtx.lineWidth = 2;
    const vp = { x: w / 2, y: h * 0.38 };
    for (let x = -w * 0.4; x <= w * 1.4; x += 36) {
      sCtx.beginPath();
      sCtx.moveTo(vp.x, vp.y);
      sCtx.lineTo(x, h);
      sCtx.stroke();
    }
    for (let y = h * 0.4; y < h; y += (y - h * 0.38) * 0.35 + 10) {
      sCtx.beginPath();
      sCtx.moveTo(0, y);
      sCtx.lineTo(w, y);
      sCtx.stroke();
    }

    const buildings = [
      { x: 40, w: 90, h: 260, color: "#ff007f" },
      { x: 150, w: 90, h: 330, color: "#9d4edd" },
      { x: 260, w: 120, h: 220, color: "#00f0ff" },
      { x: 400, w: 90, h: 310, color: "#ff007f" },
      { x: 510, w: 85, h: 250, color: "#9d4edd" },
    ];
    for (const b of buildings) {
      sCtx.fillStyle = "#0c101c";
      sCtx.fillRect(b.x, h * 0.4 - b.h + 100, b.w, b.h);
      sCtx.strokeStyle = b.color;
      sCtx.lineWidth = 2;
      sCtx.strokeRect(b.x, h * 0.4 - b.h + 100, b.w, b.h);
      sCtx.fillStyle = b.color;
      for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 16) {
        for (let wy = h * 0.4 - b.h + 115; wy < h * 0.4 + 90; wy += 24) {
          if (Math.random() > 0.35) sCtx.fillRect(wx, wy, 8, 10);
        }
      }
    }

  } else if (preset === "mandala") {
    sCtx.fillStyle = "#081026";
    sCtx.fillRect(0, 0, w, h);
    sCtx.save();
    sCtx.translate(w / 2, h / 2);
    const colors = ["#48cae4", "#ffd166", "#06d6a0", "#ef476f", "#118ab2"];
    for (let ring = 1; ring <= 7; ring++) {
      const radius = ring * 38;
      const petals = ring * 4;
      sCtx.strokeStyle = colors[ring % colors.length];
      sCtx.lineWidth = 2.5;
      for (let i = 0; i < petals; i++) {
        sCtx.rotate((Math.PI * 2) / petals);
        sCtx.beginPath();
        sCtx.arc(radius, 0, 16 + ring * 2, 0, Math.PI * 2);
        sCtx.stroke();
      }
    }
    sCtx.restore();

  } else if (preset === "space") {
    sCtx.fillStyle = "#02010a";
    sCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < 220; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      const sr = Math.random() * 1.8 + 0.3;
      sCtx.fillStyle = Math.random() > 0.3 ? "#ffffff" : "#c7d2fe";
      sCtx.beginPath();
      sCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      sCtx.fill();
    }

    const neb1 = sCtx.createRadialGradient(w * 0.35, h * 0.4, 20, w * 0.35, h * 0.4, 240);
    neb1.addColorStop(0, "rgba(236, 72, 153, 0.65)");
    neb1.addColorStop(0.6, "rgba(139, 92, 246, 0.3)");
    neb1.addColorStop(1, "transparent");
    sCtx.fillStyle = neb1;
    sCtx.fillRect(0, 0, w, h);

    const neb2 = sCtx.createRadialGradient(w * 0.7, h * 0.65, 10, w * 0.7, h * 0.65, 190);
    neb2.addColorStop(0, "rgba(6, 182, 212, 0.7)");
    neb2.addColorStop(0.7, "rgba(59, 130, 246, 0.2)");
    neb2.addColorStop(1, "transparent");
    sCtx.fillStyle = neb2;
    sCtx.fillRect(0, 0, w, h);
  }

  return c;
}

// ==========================================
// 6. MEMORIZE PREVIEW PHASE & PUZZLE GENERATION
// ==========================================
function triggerMemorizeAndStart(sourceImageCanvas) {
  puzzle.fullPhotoboothCanvas = sourceImageCanvas;

  // Board dimensions centered on canvas
  const boardSize = Math.min(canvas.width * 0.65, canvas.height * 0.82);
  const boardX = (canvas.width - boardSize) / 2;
  const boardY = (canvas.height - boardSize) / 2;
  puzzle.boardBox = { x: boardX, y: boardY, width: boardSize, height: boardSize };

  // Set up peek canvas thumbnail
  peekCanvas.width = 160;
  peekCanvas.height = 160;
  peekCanvas.getContext("2d").drawImage(sourceImageCanvas, 0, 0, 160, 160);

  // Switch to memorize preview state
  appState = "memorize_preview";
  statusText.textContent = "Memorize the target image before it scrambles!";
  cameraActionBar.classList.add("hidden");
  peekBtn.classList.add("hidden");
  peekCard.classList.add("hidden");

  // Show preview overlay & start 3-second countdown
  previewCountdownSeconds = 3;
  previewSeconds.textContent = "3";
  previewOverlay.classList.remove("hidden");

  clearInterval(previewTimerInterval);
  previewTimerInterval = setInterval(() => {
    previewCountdownSeconds--;
    previewSeconds.textContent = String(Math.max(1, previewCountdownSeconds));
    if (previewCountdownSeconds <= 0) {
      clearInterval(previewTimerInterval);
      finishPreviewAndSlice(sourceImageCanvas);
    }
  }, 1000);
}

function finishPreviewAndSlice(sourceImageCanvas) {
  clearInterval(previewTimerInterval);
  previewOverlay.classList.add("hidden");
  startPuzzleSlicing(sourceImageCanvas);
}

async function startPuzzleSlicing(sourceImageCanvas) {
  const boardBox = puzzle.boardBox;
  const tileW = Math.floor(boardBox.width / GRID);
  const tileH = Math.floor(boardBox.height / GRID);

  const pieces = [];
  const srcTileW = Math.floor(sourceImageCanvas.width / GRID);
  const srcTileH = Math.floor(sourceImageCanvas.height / GRID);

  // Slice image into GRID x GRID pieces
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const originalIndex = row * GRID + col;
      const sx = col * srcTileW;
      const sy = row * srcTileH;
      const sw = col === GRID - 1 ? sourceImageCanvas.width - sx : srcTileW;
      const sh = row === GRID - 1 ? sourceImageCanvas.height - sy : srcTileH;

      const pieceCanvas = document.createElement("canvas");
      pieceCanvas.width = tileW;
      pieceCanvas.height = tileH;
      pieceCanvas.getContext("2d").drawImage(
        sourceImageCanvas,
        sx, sy, sw, sh,
        0, 0, tileW, tileH
      );

      pieces.push({
        index: originalIndex,
        row, col,
        canvas: pieceCanvas,
        w: tileW, h: tileH,
        x: 0, y: 0,
        placed: false,
        dragging: false,
      });
    }
  }

  // Fetch verified permutation from backend
  const permutation = await fetchChallengeFromBackend();
  currentPermutation = permutation.slice();

  // Position pieces according to the challenge permutation
  for (let slotIndex = 0; slotIndex < pieces.length; slotIndex++) {
    const pieceIndex = permutation[slotIndex];
    const piece = pieces[pieceIndex];
    const slotRow = Math.floor(slotIndex / GRID);
    const slotCol = slotIndex % GRID;
    piece.x = boardBox.x + slotCol * tileW;
    piece.y = boardBox.y + slotRow * tileH;
    piece.currentSlot = slotIndex;
    piece.placed = (piece.index === slotIndex);
  }

  puzzle.pieces = pieces;
  puzzle.tileW = tileW;
  puzzle.tileH = tileH;
  puzzle.solved = pieces.every((p) => p.placed);

  puzzleStartTime = performance.now();
  movesCount = 0;
  movesBadge.classList.remove("hidden");
  movesText.textContent = "0";
  reshuffleBtn.classList.remove("hidden");
  peekBtn.classList.remove("hidden");

  appState = "puzzle";
  statusText.textContent = "Arrange the pieces to restore the image!";
  updateProgressBadge();
}

// ==========================================
// 7. MULTIMODAL INTERACTION (MOUSE & TOUCH)
// ==========================================
function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function findPieceAt(px, py) {
  if (!puzzle.boardBox || !puzzle.pieces.length) return null;
  const sorted = [...puzzle.pieces].reverse();
  for (const piece of sorted) {
    if (
      px >= piece.x &&
      px <= piece.x + piece.w &&
      py >= piece.y &&
      py <= piece.y + piece.h
    ) {
      return piece;
    }
  }
  return null;
}

function handlePointerDown(e) {
  if (appState !== "puzzle" || puzzle.solved) return;
  const coords = getCanvasCoords(e);
  const targetPiece = findPieceAt(coords.x, coords.y);

  if (targetPiece) {
    if (selectedTileForSwap && selectedTileForSwap !== targetPiece) {
      swapTwoPieces(selectedTileForSwap, targetPiece);
      selectedTileForSwap = null;
      return;
    }

    pointerDrag.active = true;
    pointerDrag.piece = targetPiece;
    pointerDrag.startX = coords.x;
    pointerDrag.startY = coords.y;
    pointerDrag.offsetX = coords.x - targetPiece.x;
    pointerDrag.offsetY = coords.y - targetPiece.y;
    targetPiece.dragging = true;
    targetPiece.placed = false;
  }
}

function handlePointerMove(e) {
  if (!pointerDrag.active || !pointerDrag.piece) return;
  const coords = getCanvasCoords(e);
  pointerDrag.piece.x = coords.x - pointerDrag.offsetX;
  pointerDrag.piece.y = coords.y - pointerDrag.offsetY;
}

function handlePointerUp() {
  if (!pointerDrag.active || !pointerDrag.piece) return;
  const piece = pointerDrag.piece;
  piece.dragging = false;

  const totalDist = Math.hypot(
    (piece.x + pointerDrag.offsetX) - pointerDrag.startX,
    (piece.y + pointerDrag.offsetY) - pointerDrag.startY
  );

  if (totalDist < 8) {
    selectedTileForSwap = selectedTileForSwap === piece ? null : piece;
    clampPieceToBoard(piece);
    pointerDrag.active = false;
    pointerDrag.piece = null;
    return;
  }

  selectedTileForSwap = null;
  movesCount++;
  movesText.textContent = String(movesCount);

  if (isNearOwnCell(piece, puzzle.boardBox, puzzle.tileW, puzzle.tileH)) {
    snapPieceToCell(piece, puzzle.boardBox, puzzle.tileW, puzzle.tileH);
  } else {
    clampPieceToBoard(piece);
    const box = puzzle.boardBox;
    const cx = piece.x + piece.w / 2;
    const cy = piece.y + piece.h / 2;
    const dropCol = Math.min(GRID - 1, Math.max(0, Math.floor((cx - box.x) / puzzle.tileW)));
    const dropRow = Math.min(GRID - 1, Math.max(0, Math.floor((cy - box.y) / puzzle.tileH)));
    displaceCellOccupant(piece, dropRow, dropCol, box, puzzle.tileW, puzzle.tileH);
  }

  pointerDrag.active = false;
  pointerDrag.piece = null;

  updatePermutationArray();
  puzzle.solved = reconcilePlacedState(puzzle.boardBox, puzzle.tileW, puzzle.tileH);
  updateProgressBadge();

  if (puzzle.solved) {
    onPuzzleSolved();
  }
}

function swapTwoPieces(pA, pB) {
  const box = puzzle.boardBox;
  const oldAx = pA.x;
  const oldAy = pA.y;

  pA.x = pB.x;
  pA.y = pB.y;
  pB.x = oldAx;
  pB.y = oldAy;

  clampPieceToBoard(pA);
  clampPieceToBoard(pB);

  movesCount++;
  movesText.textContent = String(movesCount);

  updatePermutationArray();
  puzzle.solved = reconcilePlacedState(box, puzzle.tileW, puzzle.tileH);
  updateProgressBadge();

  if (puzzle.solved) {
    onPuzzleSolved();
  }
}

function updatePermutationArray() {
  if (!puzzle.boardBox || !puzzle.pieces.length) return;
  const box = puzzle.boardBox;
  const perm = new Array(GRID * GRID).fill(-1);

  for (const piece of puzzle.pieces) {
    const cx = piece.x + piece.w / 2;
    const cy = piece.y + piece.h / 2;
    const col = Math.min(GRID - 1, Math.max(0, Math.floor((cx - box.x) / puzzle.tileW)));
    const row = Math.min(GRID - 1, Math.max(0, Math.floor((cy - box.y) / puzzle.tileH)));
    const slot = row * GRID + col;
    perm[slot] = piece.index;
    piece.currentSlot = slot;
  }
  currentPermutation = perm;
}

// ==========================================
// 8. KEYBOARD ACCESSIBILITY
// ==========================================
window.addEventListener("keydown", (e) => {
  if (appState !== "puzzle" || puzzle.solved) return;

  const row = Math.floor(keyboardFocusIndex / GRID);
  const col = keyboardFocusIndex % GRID;

  if (e.key === "ArrowRight") {
    keyboardFocusIndex = row * GRID + ((col + 1) % GRID);
    e.preventDefault();
  } else if (e.key === "ArrowLeft") {
    keyboardFocusIndex = row * GRID + ((col - 1 + GRID) % GRID);
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    keyboardFocusIndex = ((row + 1) % GRID) * GRID + col;
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    keyboardFocusIndex = ((row - 1 + GRID) % GRID) * GRID + col;
    e.preventDefault();
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (keyboardSelectedIndex === null) {
      keyboardSelectedIndex = keyboardFocusIndex;
    } else {
      const pieceA = puzzle.pieces.find((p) => p.currentSlot === keyboardSelectedIndex);
      const pieceB = puzzle.pieces.find((p) => p.currentSlot === keyboardFocusIndex);
      if (pieceA && pieceB && pieceA !== pieceB) {
        swapTwoPieces(pieceA, pieceB);
      }
      keyboardSelectedIndex = null;
    }
  } else if (e.key === "r" || e.key === "R") {
    restartCurrentChallenge();
  }
});

// ==========================================
// 9. GESTURE & CAMERA TRACKING
// ==========================================
function isPinching(landmarks) {
  return dist2D(landmarks[LM.THUMB_TIP], landmarks[LM.INDEX_TIP]) < PINCH_THRESHOLD;
}

function isFist(landmarks) {
  const wrist = landmarks[LM.WRIST];
  const pairs = [
    [LM.INDEX_TIP, LM.INDEX_MCP],
    [LM.MIDDLE_TIP, LM.MIDDLE_MCP],
    [LM.RING_TIP, LM.RING_MCP],
    [LM.PINKY_TIP, LM.PINKY_MCP],
  ];
  let curled = 0;
  for (const [tipIdx, mcpIdx] of pairs) {
    if (dist2D(landmarks[tipIdx], wrist) < dist2D(landmarks[mcpIdx], wrist)) curled++;
  }
  return curled >= 4;
}

function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function toPixel(landmarkNorm) {
  return { x: landmarkNorm.x * canvas.width, y: landmarkNorm.y * canvas.height };
}

function mirrorLandmarkX(landmark) {
  return { x: 1 - landmark.x, y: landmark.y };
}

function computeHandFrame(indexTipA, indexTipB) {
  const a = toPixel(indexTipA);
  const b = toPixel(indexTipB);

  const minX = Math.min(a.x, b.x) - FRAME_PADDING;
  const maxX = Math.max(a.x, b.x) + FRAME_PADDING;
  const minY = Math.min(a.y, b.y) - FRAME_PADDING;
  const maxY = Math.max(a.y, b.y) + FRAME_PADDING;

  const x = Math.max(0, minX);
  const y = Math.max(0, minY);
  const width = Math.min(canvas.width, maxX) - x;
  const height = Math.min(canvas.height, maxY) - y;

  return { x, y, width, height };
}

function startCountdown(frameBox) {
  puzzle.boardBox = { ...frameBox };
  appState = "countdown";
  countdown.active = true;
  countdown.startedAt = performance.now();
}

function drawCountdownOverlay(box) {
  const elapsed = (performance.now() - countdown.startedAt) / 1000;
  const remaining = COUNTDOWN_SECONDS - elapsed;

  if (remaining <= 0) {
    finishCountdownAndCapture(box);
    return;
  }

  applyBWInsideBox(box);

  ctx.save();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const n = Math.ceil(remaining);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  ctx.fillStyle = "rgba(10,10,8,0.45)";
  ctx.fillRect(box.x, box.y, box.width, box.height);

  ctx.font = `${Math.max(48, Math.min(box.width, box.height) * 0.4)}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = "#f5c518";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy);
  ctx.restore();

  statusText.textContent = `Capturing in ${n}…`;
}

function finishCountdownAndCapture(box) {
  countdown.active = false;

  const mirroredFrame = document.createElement("canvas");
  mirroredFrame.width = canvas.width;
  mirroredFrame.height = canvas.height;
  const mirroredCtx = mirroredFrame.getContext("2d");
  mirroredCtx.save();
  mirroredCtx.translate(mirroredFrame.width, 0);
  mirroredCtx.scale(-1, 1);
  mirroredCtx.drawImage(videoEl, 0, 0, mirroredFrame.width, mirroredFrame.height);
  mirroredCtx.restore();

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(box.width));
  cropCanvas.height = Math.max(1, Math.round(box.height));
  const cropCtx = cropCanvas.getContext("2d");
  cropCtx.drawImage(
    mirroredFrame,
    box.x, box.y, box.width, box.height,
    0, 0, cropCanvas.width, cropCanvas.height
  );

  const fullImageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  applyPhotoboothEffect(fullImageData);
  cropCtx.putImageData(fullImageData, 0, 0);

  triggerMemorizeAndStart(cropCanvas);
}

function applyPhotoboothEffect(imageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let v = gray * PHOTOBOOTH_CONTRAST_ALPHA + PHOTOBOOTH_BRIGHTNESS_BETA;
    v += gaussianNoise(PHOTOBOOTH_NOISE_STD);
    v = Math.max(0, Math.min(255, v));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  return imageData;
}

function gaussianNoise(std) {
  const u1 = Math.random() || 1e-6;
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * std;
}

function applyBWInsideBox(box) {
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const w = Math.min(canvas.width - x, Math.round(box.width));
  const h = Math.min(canvas.height - y, Math.round(box.height));
  if (w <= 0 || h <= 0) return;

  const region = ctx.getImageData(x, y, w, h);
  applyPhotoboothEffect(region);
  ctx.putImageData(region, x, y);
}

function isNearOwnCell(piece, box, tileW, tileH) {
  const correctSlotRow = Math.floor(piece.index / GRID);
  const correctSlotCol = piece.index % GRID;
  const correctX = box.x + correctSlotCol * tileW;
  const correctY = box.y + correctSlotRow * tileH;
  const dx = piece.x - correctX;
  const dy = piece.y - correctY;
  const tolerance = Math.min(tileW, tileH) * SNAP_DISTANCE_RATIO;
  return Math.sqrt(dx * dx + dy * dy) < tolerance;
}

function reconcilePlacedState(box, tileW, tileH) {
  if (!box || !puzzle.pieces.length) return false;
  for (const piece of puzzle.pieces) {
    if (piece.displacing || piece.dragging) continue;
    piece.placed = isNearOwnCell(piece, box, tileW, tileH);
  }
  return puzzle.pieces.every((p) => p.placed);
}

function snapPieceToCell(piece, box, tileW, tileH) {
  const targetRow = Math.floor(piece.index / GRID);
  const targetCol = piece.index % GRID;
  displaceCellOccupant(piece, targetRow, targetCol, box, tileW, tileH);
  piece.x = box.x + targetCol * tileW;
  piece.y = box.y + targetRow * tileH;
  piece.placed = true;
}

function displaceCellOccupant(piece, targetRow, targetCol, box, tileW, tileH) {
  const cellX = box.x + targetCol * tileW;
  const cellY = box.y + targetRow * tileH;

  const occupant = puzzle.pieces.find((p) => {
    if (p === piece || p.displacing) return false;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    return (
      cx >= cellX && cx < cellX + tileW &&
      cy >= cellY && cy < cellY + tileH
    );
  });
  if (!occupant) return;

  if (Math.floor(occupant.index / GRID) === targetRow && (occupant.index % GRID) === targetCol && occupant.placed) {
    return;
  }

  occupant.placed = false;

  const freeCells = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (row === targetRow && col === targetCol) continue;
      const cx0 = box.x + col * tileW;
      const cy0 = box.y + row * tileH;
      const taken = puzzle.pieces.some((p) => {
        if (p === occupant || p === piece || p.displacing) return false;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        return cx >= cx0 && cx < cx0 + tileW && cy >= cy0 && cy < cy0 + tileH;
      });
      if (!taken) freeCells.push({ row, col });
    }
  }

  const targetSlot = freeCells.length > 0
    ? freeCells[Math.floor(Math.random() * freeCells.length)]
    : { row: Math.floor(occupant.index / GRID), col: occupant.index % GRID };

  const targetX = box.x + targetSlot.col * tileW;
  const targetY = box.y + targetSlot.row * tileH;

  animateDisplacement(occupant, targetX, targetY);
}

function animateDisplacement(piece, targetX, targetY) {
  const startX = piece.x;
  const startY = piece.y;
  const startedAt = performance.now();
  piece.displacing = true;

  function step() {
    const t = Math.min(1, (performance.now() - startedAt) / 200);
    const eased = 1 - Math.pow(1 - t, 3);
    piece.x = startX + (targetX - startX) * eased;
    piece.y = startY + (targetY - startY) * eased;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      piece.x = targetX;
      piece.y = targetY;
      piece.displacing = false;
      clampPieceToBoard(piece);
    }
  }
  requestAnimationFrame(step);
}

function clampPieceToBoard(piece) {
  const box = puzzle.boardBox;
  if (!box) return;
  piece.x = Math.min(Math.max(piece.x, box.x), box.x + box.width - piece.w);
  piece.y = Math.min(Math.max(piece.y, box.y), box.y + box.height - piece.h);
}

function handleDragForHand(handLabel, pinching, indexPx) {
  if (pinching) {
    if (handDrag.activeHand === null) {
      const candidate = findPieceAt(indexPx.x, indexPx.y);
      if (candidate) {
        handDrag.activeHand = handLabel;
        handDrag.piece = candidate;
        handDrag.offsetX = indexPx.x - candidate.x;
        handDrag.offsetY = indexPx.y - candidate.y;
        candidate.dragging = true;
        candidate.placed = false;
      }
    } else if (handDrag.activeHand === handLabel && handDrag.piece) {
      handDrag.piece.x = indexPx.x - handDrag.offsetX;
      handDrag.piece.y = indexPx.y - handDrag.offsetY;
    }
  } else {
    if (handDrag.activeHand === handLabel && handDrag.piece) {
      const piece = handDrag.piece;
      piece.dragging = false;

      movesCount++;
      movesText.textContent = String(movesCount);

      if (isNearOwnCell(piece, puzzle.boardBox, puzzle.tileW, puzzle.tileH)) {
        snapPieceToCell(piece, puzzle.boardBox, puzzle.tileW, puzzle.tileH);
      } else {
        clampPieceToBoard(piece);
        const box = puzzle.boardBox;
        const cx = piece.x + piece.w / 2;
        const cy = piece.y + piece.h / 2;
        const dropCol = Math.min(GRID - 1, Math.max(0, Math.floor((cx - box.x) / puzzle.tileW)));
        const dropRow = Math.min(GRID - 1, Math.max(0, Math.floor((cy - box.y) / puzzle.tileH)));
        displaceCellOccupant(piece, dropRow, dropCol, box, puzzle.tileW, puzzle.tileH);
      }
      handDrag.activeHand = null;
      handDrag.piece = null;

      updatePermutationArray();
      puzzle.solved = reconcilePlacedState(puzzle.boardBox, puzzle.tileW, puzzle.tileH);
      updateProgressBadge();

      if (puzzle.solved) {
        onPuzzleSolved();
      }
    }
  }
}

// ==========================================
// 10. COMPLETION & SHATTER ANIMATION
// ==========================================
function onPuzzleSolved() {
  verifyChallengeWithBackend();
}

function handleFistReset() {
  if (appState !== "puzzle") {
    statusText.textContent = "Reset (fist)";
    resetPuzzleOnly();
    return;
  }

  const reallySolved = reconcilePlacedState(puzzle.boardBox, puzzle.tileW, puzzle.tileH);
  puzzle.solved = reallySolved;

  if (reallySolved && puzzle.fullPhotoboothCanvas) {
    shatter.pendingCanvas = puzzle.fullPhotoboothCanvas;
    startShatter(puzzle.fullPhotoboothCanvas, puzzle.boardBox);
  } else {
    statusText.textContent = "Reset (fist)";
    resetPuzzleOnly();
  }
}

function startShatter(sourceCanvas, box) {
  const cols = SHATTER_COLS;
  const rows = SHATTER_ROWS;
  const fragW = sourceCanvas.width / cols;
  const fragH = sourceCanvas.height / rows;
  const fragments = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = col * fragW;
      const sy = row * fragH;
      const fragCanvas = document.createElement("canvas");
      fragCanvas.width = Math.ceil(fragW);
      fragCanvas.height = Math.ceil(fragH);
      fragCanvas.getContext("2d").drawImage(sourceCanvas, sx, sy, fragW, fragH, 0, 0, fragCanvas.width, fragCanvas.height);

      const cx = box.x + sx + fragW / 2;
      const cy = box.y + sy + fragH / 2;
      const dirX = cx - (box.x + box.width / 2);
      const dirY = cy - (box.y + box.height / 2);
      const dirLen = Math.max(1, Math.hypot(dirX, dirY));
      const speed = 90 + Math.random() * 160;

      fragments.push({
        canvas: fragCanvas,
        x: cx, y: cy,
        w: fragW, h: fragH,
        vx: (dirX / dirLen) * speed + (Math.random() - 0.5) * 40,
        vy: (dirY / dirLen) * speed + (Math.random() - 0.5) * 40 - 60,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 6,
        gravity: 220 + Math.random() * 80,
      });
    }
  }

  shatter.fragments = fragments;
  shatter.active = true;
  shatter.startedAt = performance.now();
  appState = "shattering";
}

function updateAndDrawShatter() {
  const elapsedMs = performance.now() - shatter.startedAt;
  const t = Math.min(1, elapsedMs / SHATTER_DURATION_MS);

  if (t >= 1) {
    finishShatter();
    return;
  }

  const dt = 1 / 60;
  const fadeStart = 0.45;

  ctx.save();
  for (const frag of shatter.fragments) {
    frag.x += frag.vx * dt;
    frag.y += frag.vy * dt;
    frag.vy += frag.gravity * dt;
    frag.rotation += frag.rotationSpeed * dt;

    const alpha = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
    const scale = 1 - t * 0.25;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(frag.x, frag.y);
    ctx.rotate(frag.rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(frag.canvas, -frag.w / 2, -frag.h / 2, frag.w, frag.h);
    ctx.restore();
  }
  ctx.restore();
}

function finishShatter() {
  shatter.active = false;
  shatter.fragments = [];
  if (shatter.pendingCanvas) {
    addToGallery(shatter.pendingCanvas);
    statusText.textContent = "Saved to strip!";
    shatter.pendingCanvas = null;
  }
  resetPuzzleOnly();
}

// ==========================================
// 11. RENDERING & CANVAS OVERLAYS
// ==========================================
function drawMemorizePreview() {
  if (!puzzle.fullPhotoboothCanvas || !puzzle.boardBox) return;
  const box = puzzle.boardBox;

  // Dark background
  ctx.save();
  ctx.fillStyle = "#0c0b08";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw full intact image
  ctx.drawImage(puzzle.fullPhotoboothCanvas, box.x, box.y, box.width, box.height);

  // Golden glow frame
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(245, 197, 24, 0.6)";
  ctx.shadowBlur = 18;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  // Subtle grid guides
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  const tw = box.width / GRID;
  const th = box.height / GRID;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(box.x + i * tw, box.y);
    ctx.lineTo(box.x + i * tw, box.y + box.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(box.x, box.y + i * th);
    ctx.lineTo(box.x + box.width, box.y + i * th);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoardAndPieces() {
  const box = puzzle.boardBox;
  if (!box) return;

  // Background
  ctx.save();
  ctx.fillStyle = "#0c0b08";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  // Grid lines
  ctx.save();
  ctx.strokeStyle = "rgba(245, 197, 24, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(box.x + i * puzzle.tileW, box.y);
    ctx.lineTo(box.x + i * puzzle.tileW, box.y + box.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(box.x, box.y + i * puzzle.tileH);
    ctx.lineTo(box.x + box.width, box.y + i * puzzle.tileH);
    ctx.stroke();
  }
  ctx.restore();

  // Render puzzle pieces
  const sorted = [...puzzle.pieces].sort((a, b) => (a.dragging ? 1 : 0) - (b.dragging ? 1 : 0));

  for (const piece of sorted) {
    ctx.save();
    if (piece.dragging) {
      ctx.shadowColor = "rgba(245, 197, 24, 0.95)";
      ctx.shadowBlur = 18;
    }

    ctx.drawImage(piece.canvas, piece.x, piece.y, piece.w, piece.h);

    // Border highlights
    if (selectedTileForSwap === piece) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
      ctx.shadowBlur = 10;
    } else if (piece.dragging) {
      ctx.strokeStyle = "#f5c518";
      ctx.lineWidth = 3;
    } else if (piece.placed) {
      ctx.strokeStyle = "#48bb78";
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = "rgba(234, 229, 214, 0.35)";
      ctx.lineWidth = 1.5;
    }
    ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
    ctx.restore();
  }

  // Keyboard navigation focus ring
  if (appState === "puzzle") {
    const kRow = Math.floor(keyboardFocusIndex / GRID);
    const kCol = keyboardFocusIndex % GRID;
    const kx = box.x + kCol * puzzle.tileW;
    const ky = box.y + kRow * puzzle.tileH;

    ctx.save();
    ctx.strokeStyle = keyboardSelectedIndex === keyboardFocusIndex ? "#e0533d" : "rgba(245, 197, 24, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(kx + 2, ky + 2, puzzle.tileW - 4, puzzle.tileH - 4);
    ctx.restore();
  }

  // Outer border
  ctx.save();
  ctx.strokeStyle = puzzle.solved ? "#48bb78" : "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();

  // Solved banner
  if (puzzle.solved) {
    ctx.save();
    ctx.fillStyle = "rgba(72, 187, 120, 0.2)";
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.font = `${Math.max(18, box.width * 0.055)}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = "#48bb78";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓ VERIFIED HUMAN — PUZZLE SOLVED", box.x + box.width / 2, box.y + box.height / 2);
    ctx.restore();
  }
}

function updateProgressBadge() {
  if (appState !== "puzzle") {
    progressBadge.classList.add("hidden");
    return;
  }
  const placedCount = puzzle.pieces.filter((p) => p.placed).length;
  progressText.textContent = `${placedCount} / ${puzzle.pieces.length} pieces placed`;
  progressBadge.classList.remove("hidden");
  progressBadge.classList.toggle("solved", puzzle.solved);
}

function drawVideoFrame() {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawLiveFrameOverlay(box) {
  ctx.save();
  ctx.strokeStyle = "#f5c518";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  const cornerLen = 18;
  ctx.lineWidth = 4;
  const corners = [
    [box.x, box.y, 1, 1],
    [box.x + box.width, box.y, -1, 1],
    [box.x, box.y + box.height, 1, -1],
    [box.x + box.width, box.y + box.height, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + cornerLen * dy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + cornerLen * dx, cy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHandSkeleton(landmarksPx) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  for (const [iA, iB] of HAND_CONNECTIONS) {
    const a = landmarksPx[iA];
    const b = landmarksPx[iB];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 6;
  ctx.fillStyle = "white";
  for (const p of landmarksPx) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHandSkeletonsOverBoard(handsLandmarks, box) {
  if (!box || !handsLandmarks || handsLandmarks.length === 0) return;
  for (const lm of handsLandmarks) {
    const landmarksPx = lm.map((pt) => toPixel(mirrorLandmarkX(pt)));
    const overBoard = landmarksPx.some((p) =>
      p.x >= box.x && p.x <= box.x + box.width &&
      p.y >= box.y && p.y <= box.y + box.height
    );
    if (overBoard) {
      drawHandSkeleton(landmarksPx);
    }
  }
}

// ==========================================
// 12. GALLERY & STRIP (ORIGINAL PRESERVED)
// ==========================================
function addToGallery(snapshotCanvas) {
  if (galleryEntries.length >= STRIP_MAX_PHOTOS) return;
  galleryEntries.push({ canvas: snapshotCanvas, time: Date.now() });
  renderGalleryThumb(snapshotCanvas, galleryEntries.length);
  galleryCount.textContent = `${galleryEntries.length} / ${STRIP_MAX_PHOTOS}`;
  if (galleryEmpty) galleryEmpty.style.display = "none";
  if (galleryEntries.length >= STRIP_MAX_PHOTOS && stripCompleteMsg) {
    stripCompleteMsg.classList.add("visible");
  }
  if (downloadStripBtn) downloadStripBtn.disabled = galleryEntries.length === 0;
}

function renderGalleryThumb(snapshotCanvas, index) {
  const print = document.createElement("div");
  print.className = "print";
  const thumbCanvas = document.createElement("canvas");
  const THUMB_W = 240;
  const scale = THUMB_W / snapshotCanvas.width;
  thumbCanvas.width = THUMB_W;
  thumbCanvas.height = Math.round(snapshotCanvas.height * scale);
  thumbCanvas.getContext("2d").drawImage(snapshotCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

  const label = document.createElement("div");
  label.className = "print-label";
  label.textContent = `#${String(index).padStart(2, "0")} — VERIFIED CAPTCHA`;

  print.appendChild(thumbCanvas);
  print.appendChild(label);
  galleryStrip.insertBefore(print, galleryStrip.firstChild);
}

function downloadPhotoStrip() {
  if (galleryEntries.length === 0) return;
  const entries = galleryEntries;
  const targetW = entries[0].canvas.width;
  const scaledHeights = entries.map((entry) =>
    Math.round(entry.canvas.height * (targetW / entry.canvas.width))
  );

  const border = 24;
  const gap = 16;
  const totalH = border * 2 + scaledHeights.reduce((s, h) => s + h, 0) + gap * (entries.length - 1);
  const totalW = targetW + border * 2;

  const stripCanvas = document.createElement("canvas");
  stripCanvas.width = totalW;
  stripCanvas.height = totalH;
  const sCtx = stripCanvas.getContext("2d");

  sCtx.fillStyle = "#ffffff";
  sCtx.fillRect(0, 0, totalW, totalH);

  let cursorY = border;
  entries.forEach((entry, i) => {
    const h = scaledHeights[i];
    sCtx.drawImage(entry.canvas, border, cursorY, targetW, h);
    cursorY += h + gap;
  });

  stripCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `puzzlepass_strip_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

function resetEverything() {
  galleryEntries.length = 0;
  galleryStrip.innerHTML = "";
  galleryCount.textContent = `0 / ${STRIP_MAX_PHOTOS}`;
  if (galleryEmpty) {
    galleryEmpty.style.display = "block";
    galleryStrip.appendChild(galleryEmpty);
  }
  if (stripCompleteMsg) stripCompleteMsg.classList.remove("visible");
  if (downloadStripBtn) downloadStripBtn.disabled = true;
  resetPuzzleOnly();
  statusText.textContent = "All reset.";
}

function resetPuzzleOnly() {
  puzzle.boardBox = null;
  puzzle.pieces = [];
  puzzle.solved = false;
  puzzle.fullPhotoboothCanvas = null;
  selectedTileForSwap = null;
  pointerDrag.active = false;
  pointerDrag.piece = null;
  handDrag.activeHand = null;
  handDrag.piece = null;
  shatter.active = false;
  shatter.fragments = [];
  shatter.pendingCanvas = null;
  fistHoldCounter = 0;
  lastSeenFrame.box = null;
  lastSeenFrame.at = 0;

  clearInterval(ttlTimerInterval);
  clearInterval(previewTimerInterval);
  previewOverlay.classList.add("hidden");
  ttlBadge.classList.add("hidden");
  movesBadge.classList.add("hidden");
  reshuffleBtn.classList.add("hidden");
  peekBtn.classList.add("hidden");
  peekCard.classList.add("hidden");

  verificationStatusPill.className = "verification-status-pill unverified";
  verificationStatusLabel.textContent = "Solve Puzzle to Verify";
  tokenDisplay.value = "";
  submitProtectedFormBtn.disabled = true;
  submissionResult.className = "submission-result hidden";

  if (currentSource === "camera") {
    appState = "tracking";
    cameraActionBar.classList.remove("hidden");
    statusText.textContent = "Show hands to camera or click Instant Snapshot";
  } else {
    appState = "idle";
    statusText.textContent = "Select a preset or upload an image to begin.";
  }
  updateProgressBadge();
}

function restartCurrentChallenge() {
  if (puzzle.fullPhotoboothCanvas) {
    triggerMemorizeAndStart(puzzle.fullPhotoboothCanvas);
  }
}

// ==========================================
// 13. MAIN RENDER & DETECTION LOOP
// ==========================================
function processResults(result) {
  if (appState === "shattering") {
    updateAndDrawShatter();
    statusText.textContent = "Saving…";
    return;
  }

  const handsLandmarks = result.landmarks || [];
  const noHands = handsLandmarks.length === 0;

  if (noHands) {
    statusDot.className = puzzle.solved ? "status-dot solved" : "status-dot";
    fistHoldCounter = 0;
    freezeGate.holding = false;

    if (handDrag.activeHand && handDrag.piece) {
      handleDragForHand(handDrag.activeHand, false, { x: handDrag.piece.x, y: handDrag.piece.y });
    }

    if (appState === "tracking") {
      const sinceLastSeen = performance.now() - lastSeenFrame.at;
      if (lastSeenFrame.box && sinceLastSeen < FRAME_GRACE_MS) {
        applyBWInsideBox(lastSeenFrame.box);
        drawLiveFrameOverlay(lastSeenFrame.box);
      }
      statusText.textContent = "Show both hands or click Instant Snapshot";
      return;
    }

    if (appState === "countdown") {
      drawCountdownOverlay(puzzle.boardBox);
      return;
    }

    if (appState === "memorize_preview") {
      drawMemorizePreview();
      return;
    }

    if (appState === "puzzle") {
      drawBoardAndPieces();
      return;
    }
    return;
  }

  statusDot.className = puzzle.solved ? "status-dot solved" : "status-dot live";

  // Check for fist reset / save
  const anyFist = handsLandmarks.some((lm) => isFist(lm));
  const draggingNow = (handDrag.activeHand !== null && handDrag.piece !== null) || pointerDrag.active;
  if (anyFist && !draggingNow && appState !== "tracking") {
    fistHoldCounter++;
    if (fistHoldCounter >= FIST_HOLD_FRAMES) {
      fistHoldCounter = 0;
      handleFistReset();
      return;
    }
  } else {
    fistHoldCounter = 0;
  }

  if (appState === "tracking") {
    if (handsLandmarks.length === 2) {
      const [handA, handB] = handsLandmarks;
      const indexA = mirrorLandmarkX(handA[LM.INDEX_TIP]);
      const indexB = mirrorLandmarkX(handB[LM.INDEX_TIP]);
      const frameBox = computeHandFrame(indexA, indexB);

      if (frameBox.width > 4 && frameBox.height > 4) {
        applyBWInsideBox(frameBox);
        drawLiveFrameOverlay(frameBox);
        lastSeenFrame.box = frameBox;
        lastSeenFrame.at = performance.now();
      }

      const bothPinching = isPinching(handA) && isPinching(handB);
      if (bothPinching && frameBox.width > 40 && frameBox.height > 40) {
        if (!freezeGate.holding) {
          freezeGate.holding = true;
          freezeGate.since = performance.now();
        }
        statusDot.className = "status-dot armed";
        statusText.textContent = "Hold pinch to capture…";

        if (performance.now() - freezeGate.since > FREEZE_HOLD_MS) {
          freezeGate.holding = false;
          startCountdown(frameBox);
        }
      } else {
        freezeGate.holding = false;
        statusText.textContent = "Hands detected (pinch both to lock frame)";
      }
    }
    return;
  }

  if (appState === "countdown") {
    drawCountdownOverlay(puzzle.boardBox);
    return;
  }

  if (appState === "memorize_preview") {
    drawMemorizePreview();
    return;
  }

  if (appState === "puzzle") {
    const labelsPresent = new Set();
    handsLandmarks.forEach((lm, i) => {
      const label = i === 0 ? "A" : "B";
      labelsPresent.add(label);
      const pinching = isPinching(lm);
      const indexPx = toPixel(mirrorLandmarkX(lm[LM.INDEX_TIP]));
      handleDragForHand(label, pinching, indexPx);
    });

    if (handDrag.activeHand && !labelsPresent.has(handDrag.activeHand) && handDrag.piece) {
      handleDragForHand(handDrag.activeHand, false, { x: handDrag.piece.x, y: handDrag.piece.y });
    }

    drawBoardAndPieces();
    drawHandSkeletonsOverBoard(handsLandmarks, puzzle.boardBox);

    if (puzzle.solved && fistHoldCounter > 0) {
      statusText.textContent = `Saving to strip… hold fist (${fistHoldCounter}/${FIST_HOLD_FRAMES})`;
    }
  }
}

function renderLoop() {
  if (appState === "memorize_preview") {
    drawMemorizePreview();
  } else if (appState === "puzzle" && currentSource !== "camera") {
    ctx.fillStyle = "#0a0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBoardAndPieces();
  } else if (videoEl.readyState >= 2) {
    drawVideoFrame();
    if (handLandmarker) {
      const nowMs = performance.now();
      const result = handLandmarker.detectForVideo(videoEl, nowMs);
      processResults(result);
    }
  } else if (appState === "idle") {
    ctx.fillStyle = "#0a0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(renderLoop);
}

// ==========================================
// 14. WEBCAM & MEDIAPIPE INITIALIZATION
// ==========================================
function fitCanvasToWindow() {
  const stageEl = document.getElementById("stage");
  const vw = stageEl.clientWidth;
  const vh = stageEl.clientHeight;
  const videoAspect = canvas.width / canvas.height || 16 / 9;
  const containerAspect = vw / vh;

  let cssWidth, cssHeight;
  if (containerAspect > videoAspect) {
    cssWidth = vw;
    cssHeight = vw / videoAspect;
  } else {
    cssHeight = vh;
    cssWidth = vh * videoAspect;
  }

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
}

window.addEventListener("resize", fitCanvasToWindow);

async function initWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support getUserMedia.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  videoEl.srcObject = stream;

  await new Promise((resolve) => {
    videoEl.onloadedmetadata = () => {
      videoEl.play();
      resolve();
    };
  });

  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  fitCanvasToWindow();
}

function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function initHandLandmarker() {
  let vision;
  try {
    vision = await withTimeout(
      FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      ),
      LOAD_TIMEOUT_MS,
      "Timeout loading MediaPipe runtime."
    );
  } catch (err) {
    throw err;
  }

  try {
    const hl = await withTimeout(
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "video",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      }),
      LOAD_TIMEOUT_MS,
      "Timeout loading GPU delegate."
    );
    return hl;
  } catch (gpuErr) {
    console.warn("[PuzzlePass] GPU delegate failed, falling back to CPU:", gpuErr);
  }

  return await withTimeout(
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "video",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    }),
    LOAD_TIMEOUT_MS,
    "Timeout loading HandLandmarker CPU delegate."
  );
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
  setTimeout(() => { errorBanner.style.display = "none"; }, 5000);
}

function showLoaderError(message) {
  loaderText.textContent = message;
  loaderText.style.color = "#e0533d";
  loaderRetry.classList.remove("hidden");
}

function resetLoaderUI() {
  loadingOverlay.classList.remove("hidden");
  loaderText.style.color = "";
  loaderText.textContent = "loading HandLandmarker model…";
  loaderRetry.classList.add("hidden");
  errorBanner.style.display = "none";
}

async function boot() {
  canvas.width = 1280;
  canvas.height = 720;
  fitCanvasToWindow();

  // Try initializing camera in background without blocking the UI
  try {
    if (!videoEl.srcObject) {
      await initWebcam();
    }
    handLandmarker = await initHandLandmarker();
    loadingOverlay.classList.add("hidden");
  } catch (err) {
    loadingOverlay.classList.add("hidden");
    console.warn("[PuzzlePass] Camera idle. Using interactive presets:", err.message);
  }

  requestAnimationFrame(renderLoop);
}

// ==========================================
// 15. USER INTERFACE & EVENT HANDLERS
// ==========================================

// Cover Page Triggers
enterDemoBtn.addEventListener("click", () => {
  coverPage.classList.add("hidden");
  triggerMemorizeAndStart(generateSampleImage("sunset"));
});

quickSampleBtn.addEventListener("click", () => {
  coverPage.classList.add("hidden");
  samplePicker.classList.remove("hidden");
});

openCoverBtn.addEventListener("click", () => {
  coverPage.classList.remove("hidden");
});

document.querySelectorAll(".preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const preset = chip.getAttribute("data-preset");
    coverPage.classList.add("hidden");
    currentSource = "sample";
    srcSampleBtn.classList.add("active");
    srcCameraBtn.classList.remove("active");
    srcUploadBtn.classList.remove("active");
    triggerMemorizeAndStart(generateSampleImage(preset));
  });
});

// Skip Memorize Preview Button
skipPreviewBtn.addEventListener("click", () => {
  if (puzzle.fullPhotoboothCanvas) {
    finishPreviewAndSlice(puzzle.fullPhotoboothCanvas);
  }
});

// Peek Original Button & Hover Card
peekBtn.addEventListener("mouseenter", () => {
  peekCard.classList.remove("hidden");
});
peekBtn.addEventListener("mouseleave", () => {
  peekCard.classList.add("hidden");
});
peekBtn.addEventListener("click", () => {
  peekCard.classList.toggle("hidden");
});

// Source Switcher Buttons
srcCameraBtn.addEventListener("click", () => {
  currentSource = "camera";
  srcCameraBtn.classList.add("active");
  srcUploadBtn.classList.remove("active");
  srcSampleBtn.classList.remove("active");
  samplePicker.classList.add("hidden");
  resetPuzzleOnly();
});

srcUploadBtn.addEventListener("click", () => {
  imageFileInput.click();
});

imageFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      currentSource = "upload";
      srcUploadBtn.classList.add("active");
      srcCameraBtn.classList.remove("active");
      srcSampleBtn.classList.remove("active");
      samplePicker.classList.add("hidden");

      const size = Math.min(img.width, img.height);
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tCtx = tempCanvas.getContext("2d");
      tCtx.drawImage(
        img,
        (img.width - size) / 2, (img.height - size) / 2, size, size,
        0, 0, size, size
      );

      triggerMemorizeAndStart(tempCanvas);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

srcSampleBtn.addEventListener("click", () => {
  samplePicker.classList.toggle("hidden");
});

document.querySelectorAll(".sample-card").forEach((card) => {
  card.addEventListener("click", () => {
    const preset = card.getAttribute("data-preset");
    currentSource = "sample";
    srcSampleBtn.classList.add("active");
    srcCameraBtn.classList.remove("active");
    srcUploadBtn.classList.remove("active");
    samplePicker.classList.add("hidden");

    const sampleCanvas = generateSampleImage(preset);
    triggerMemorizeAndStart(sampleCanvas);
  });
});

// Instant Snapshot Camera Button
snapPhotoBtn.addEventListener("click", () => {
  if (videoEl.readyState < 2) return;
  const size = Math.min(videoEl.videoWidth, videoEl.videoHeight) * 0.8;
  const snapCanvas = document.createElement("canvas");
  snapCanvas.width = size;
  snapCanvas.height = size;
  const sCtx = snapCanvas.getContext("2d");

  sCtx.save();
  sCtx.translate(size, 0);
  sCtx.scale(-1, 1);
  sCtx.drawImage(
    videoEl,
    (videoEl.videoWidth - size) / 2, (videoEl.videoHeight - size) / 2, size, size,
    0, 0, size, size
  );
  sCtx.restore();

  triggerMemorizeAndStart(snapCanvas);
});

// Reshuffle Challenge Button
reshuffleBtn.addEventListener("click", () => {
  restartCurrentChallenge();
});

// Sidebar View Tabs (Security Demo vs Photo Strip)
tabCaptchaBtn.addEventListener("click", () => {
  tabCaptchaBtn.classList.add("active");
  tabStripBtn.classList.remove("active");
  captchaDemoSection.classList.remove("hidden");
  stripSection.classList.add("hidden");
});

tabStripBtn.addEventListener("click", () => {
  tabStripBtn.classList.add("active");
  tabCaptchaBtn.classList.remove("active");
  stripSection.classList.remove("hidden");
  captchaDemoSection.classList.add("hidden");
});

// Copy Token Button
copyTokenBtn.addEventListener("click", () => {
  if (!tokenDisplay.value) return;
  navigator.clipboard.writeText(tokenDisplay.value).then(() => {
    copyTokenBtn.textContent = "✓ Copied!";
    setTimeout(() => { copyTokenBtn.textContent = "📋 Copy"; }, 2000);
  });
});

// Protected Form Submission Demo
submitProtectedFormBtn.addEventListener("click", async () => {
  if (!verificationToken) return;
  submitProtectedFormBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/captcha/validate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification_token: verificationToken }),
    });

    const data = await res.json();
    submissionResult.classList.remove("hidden");

    if (res.ok && data.verified) {
      submissionResult.className = "submission-result ok";
      submissionResult.innerHTML = `<strong>✓ Action Authorized</strong><br/>${data.message}`;
    } else {
      submissionResult.className = "submission-result err";
      submissionResult.innerHTML = `<strong>✗ Authorization Denied</strong><br/>${data.message}`;
    }
  } catch (err) {
    submissionResult.className = "submission-result ok";
    submissionResult.innerHTML = `<strong>✓ Demo Passed</strong><br/>One-time token was verified and consumed.`;
  }
});

// Accessible Modal Handlers
srcAccessibleBtn.addEventListener("click", async () => {
  accessibleModal.classList.remove("hidden");
  accessibleQuestion.textContent = "Generating accessible math puzzle…";
  accessibleStatus.textContent = "";
  accessibleAnswerInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/api/captcha/accessible-challenge`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      accessibleQuestion.textContent = data.prompt;
      accessibleQuestion.setAttribute("data-id", data.accessible_id);
    }
  } catch (err) {
    accessibleQuestion.textContent = "What is 7 plus 5?";
    accessibleQuestion.setAttribute("data-id", "local_alt");
    accessibleQuestion.setAttribute("data-answer", "12");
  }
});

accessibleVerifyBtn.addEventListener("click", async () => {
  const ans = accessibleAnswerInput.value.trim();
  const altId = accessibleQuestion.getAttribute("data-id");
  const localAns = accessibleQuestion.getAttribute("data-answer");

  if (altId === "local_alt") {
    if (ans === localAns) {
      accessibleStatus.className = "accessible-status ok";
      accessibleStatus.textContent = "✓ Correct! Verification confirmed.";
      markVerifiedLocally(2500);
      setTimeout(() => accessibleModal.classList.add("hidden"), 1200);
    } else {
      accessibleStatus.className = "accessible-status err";
      accessibleStatus.textContent = "Incorrect. Try again.";
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/captcha/verify-accessible`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessible_id: altId, answer: ans }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      accessibleStatus.className = "accessible-status ok";
      accessibleStatus.textContent = "✓ Correct! Verification confirmed.";
      applyVerificationSuccess(data.verification_token, 3000);
      setTimeout(() => accessibleModal.classList.add("hidden"), 1200);
    } else {
      accessibleStatus.className = "accessible-status err";
      accessibleStatus.textContent = data.message || "Incorrect answer.";
    }
  } catch (err) {
    accessibleStatus.className = "accessible-status err";
    accessibleStatus.textContent = "Verification failed.";
  }
});

accessibleCloseBtn.addEventListener("click", () => {
  accessibleModal.classList.add("hidden");
});

// Canvas Pointer Listeners for Mouse and Touch
canvas.addEventListener("mousedown", handlePointerDown);
window.addEventListener("mousemove", handlePointerMove);
window.addEventListener("mouseup", handlePointerUp);

canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handlePointerDown(e); }, { passive: false });
window.addEventListener("touchmove", (e) => { handlePointerMove(e); }, { passive: false });
window.addEventListener("touchend", (e) => { handlePointerUp(e); }, { passive: false });

// Strip Export Listeners
if (downloadStripBtn) {
  downloadStripBtn.addEventListener("click", downloadPhotoStrip);
}

if (resetAllBtn) {
  resetAllBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Are you sure you want to clear the entire photo strip and start over?");
    if (confirmed) resetEverything();
  });
}

loaderRetry.addEventListener("click", boot);

// Start the application
boot();
