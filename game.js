/* ═══════════════════════════════════════════════════════
   Lumina — High-FPS Minimal Cosmic Memory Game
   ═══════════════════════════════════════════════════════ */

const canvas = document.getElementById("garden");
const ctx = canvas.getContext("2d", { alpha: false });
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// Offscreen cache canvas for static/slow cosmic background layers
const bgCacheCanvas = document.createElement("canvas");
const bgCacheCtx = bgCacheCanvas.getContext("2d", { alpha: false });

// DOM refs
const els = {
  home: document.getElementById("home"),
  hud: document.getElementById("hud"),
  hudHomeBtn: document.getElementById("hudHomeBtn"),
  round: document.getElementById("roundVal"),
  score: document.getElementById("scoreVal"),
  combo: document.getElementById("comboVal"),
  comboPill: document.getElementById("comboPill"),
  shields: document.getElementById("shields"),
  phase: document.getElementById("phaseLabel"),
  msg: document.getElementById("phaseMsg"),
  seqDots: document.getElementById("seqDots"),
  timerBar: document.getElementById("timerBar"),
  timerFill: document.getElementById("timerFill"),
  feedback: document.getElementById("feedback"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultIcon: document.getElementById("resultIcon"),
  resultRank: document.getElementById("resultRank"),
  resultScoreBig: document.getElementById("resultScoreBig"),
  rPerfect: document.getElementById("rPerfect"),
  rGood: document.getElementById("rGood"),
  rAccuracy: document.getElementById("rAccuracy"),
  rCombo: document.getElementById("rCombo"),
  retryBtn: document.getElementById("retryBtn"),
  homeBtn: document.getElementById("homeBtn"),
  modeCards: document.querySelectorAll(".mode-card"),
  modeBadge: document.getElementById("modeBadge"),
  comboMeter: document.getElementById("comboMeter"),
  comboFill: document.getElementById("comboFill"),
  progressBar: document.getElementById("progressBar"),
  progressFill: document.getElementById("progressFill"),
  powerUpNotif: document.getElementById("powerUpNotif"),
  soundToggle: document.getElementById("soundToggle"),
  bestDisplay: document.getElementById("bestDisplay"),
  leaderboardToggle: document.getElementById("leaderboardToggle"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  leaderboardClose: document.getElementById("leaderboardClose"),
  homeLeaderboardSpeed: document.getElementById("homeLeaderboardSpeed"),
  homeLeaderboardEndless: document.getElementById("homeLeaderboardEndless"),
  resultLeaderboard: document.getElementById("resultLeaderboard"),
  resultLeaderboardTitle: document.getElementById("resultLeaderboardTitle"),
};

// ── Constants ──
const COLORS = ["#ff7b7b", "#b8a9e8", "#f5d76e", "#7eddb5", "#ffb5c5", "#87ceeb", "#ffab76"];
const PULSAR_POSITIONS = [
  { px: 0.20, py: 0.32 },
  { px: 0.50, py: 0.22 },
  { px: 0.80, py: 0.32 },
  { px: 0.14, py: 0.59 },
  { px: 0.50, py: 0.55 },
  { px: 0.86, py: 0.59 },
  { px: 0.50, py: 0.82 },
];

const MODES = {
  speed: {
    name: "Challenge",
    maxRounds: 15,
    lives: 3,
    watchInterval: 340,
    replayTimeout: 3200,
    startSeqLen: 3,
    endless: false,
  },
  endless: {
    name: "Endless",
    maxRounds: Infinity,
    lives: 3,
    watchInterval: 400,
    replayTimeout: 5500,
    startSeqLen: 3,
    endless: true,
  },
  zen: {
    name: "Zen",
    maxRounds: Infinity,
    lives: 5,
    watchInterval: 460,
    replayTimeout: Infinity,
    startSeqLen: 3,
    endless: true,
  },
};

const POWER_UPS = [
  { id: "freeze", symbol: "❄", icon: "❄", name: "+Time" },
  { id: "shield", symbol: "🛡", icon: "🛡", name: "+Shield" },
  { id: "double", symbol: "⚡", icon: "⚡", name: "2× Score" },
  { id: "slow", symbol: "☾", icon: "☾", name: "Slow" },
];

// ── State ──
let state = "home"; // home | countdown | watching | replaying | between | ended
let modeId = "speed";
let mode = MODES.speed;
let pulsars = [];
let twinkleStars = [];
let shootingStars = [];
let beamPulses = []; // Travelling photon comets along constellation lines
let roundClearWave = 0; // 0..1 resonance wave on round clear
let nextAmbientBeamAt = 0;
let activePowerUpDrop = null;
let activeEffects = { doublePoints: false, slowMotion: false };
let activeTimers = [];

// Smooth camera state
let camZoom = 0.94;
let camPanX = 0;
let camPanY = 0;

let score = 0;
let combo = 0;
let maxCombo = 0;
let lives = 3;
let round = 0;
let sequence = [];
let watchIndex = 0;
let replayIndex = 0;
let replayDeadline = 0;
let perfects = 0;
let goods = 0;
let misses = 0;
let currentTarget = -1;
let hoveredPulsarId = -1;
let countdownValue = 3;
let countdownStart = 0;
let feedbackTimer = null;
let w = 0,
  h = 0;
let mouseX = 0,
  mouseY = 0;

// Load best scores & local leaderboards
function loadStoredJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

const bestScores = loadStoredJson("lumina-best", {});
const leaderboards = loadStoredJson("lumina-leaderboard", { speed: [], endless: [], zen: [] });

function scheduleTimer(fn, delay) {
  const id = setTimeout(() => {
    activeTimers = activeTimers.filter((t) => t !== id);
    fn();
  }, delay);
  activeTimers.push(id);
  return id;
}

function clearAllTimers() {
  for (const id of activeTimers) clearTimeout(id);
  activeTimers = [];
}

// Pre-render a pulsar's soft radial corona glow sprite once per resize
function buildPulsarCoronaSprite(color, radius) {
  const size = Math.max(64, Math.ceil(radius * 5));
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const octx = off.getContext("2d");
  const cx = size / 2;
  const r = size / 2;
  const grad = octx.createRadialGradient(cx, cx, r * 0.04, cx, cx, r);
  grad.addColorStop(0, color);
  grad.addColorStop(0.26, `${color}66`);
  grad.addColorStop(0.6, `${color}1a`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  octx.fillStyle = grad;
  octx.beginPath();
  octx.arc(cx, cx, r, 0, Math.PI * 2);
  octx.fill();
  return off;
}

// Pre-render the deep space sky, nebulae, galaxy bands, static stars, and vignette onto bgCacheCanvas
function buildBackgroundCache() {
  if (w <= 0 || h <= 0) return;
  bgCacheCanvas.width = Math.round(w * DPR);
  bgCacheCanvas.height = Math.round(h * DPR);
  bgCacheCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 1. Deep space gradient
  const grad = bgCacheCtx.createLinearGradient(0, 0, w * 0.3, h);
  grad.addColorStop(0, "#04070e");
  grad.addColorStop(0.4, "#080e1c");
  grad.addColorStop(0.75, "#0a1324");
  grad.addColorStop(1, "#050811");
  bgCacheCtx.fillStyle = grad;
  bgCacheCtx.fillRect(0, 0, w, h);

  // 2. Soft nebula clouds (drawn once into cache!)
  bgCacheCtx.save();
  bgCacheCtx.globalCompositeOperation = "lighter";
  const nebulae = [
    { x: w * 0.22, y: h * 0.28, r: Math.max(w, h) * 0.32, hue: 200, a: 0.055 },
    { x: w * 0.78, y: h * 0.34, r: Math.max(w, h) * 0.28, hue: 265, a: 0.05 },
    { x: w * 0.5, y: h * 0.68, r: Math.max(w, h) * 0.35, hue: 168, a: 0.045 },
    { x: w * 0.3, y: h * 0.75, r: Math.max(w, h) * 0.24, hue: 320, a: 0.035 },
  ];
  for (const n of nebulae) {
    const ng = bgCacheCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, `hsla(${n.hue}, 55%, 52%, ${n.a})`);
    ng.addColorStop(0.5, `hsla(${n.hue}, 45%, 36%, ${n.a * 0.45})`);
    ng.addColorStop(1, "transparent");
    bgCacheCtx.fillStyle = ng;
    bgCacheCtx.beginPath();
    bgCacheCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    bgCacheCtx.fill();
  }

  // 3. Diagonal Milky Way band (soft gradient, zero blur filter)
  bgCacheCtx.save();
  bgCacheCtx.translate(w / 2, h / 2);
  bgCacheCtx.rotate(-0.42);
  const bandH = Math.max(w, h) * 0.22;
  const bandGrad = bgCacheCtx.createLinearGradient(0, -bandH, 0, bandH);
  bandGrad.addColorStop(0, "transparent");
  bandGrad.addColorStop(0.5, "rgba(126, 221, 181, 0.028)");
  bandGrad.addColorStop(1, "transparent");
  bgCacheCtx.fillStyle = bandGrad;
  bgCacheCtx.fillRect(-w, -bandH, w * 2, bandH * 2);
  bgCacheCtx.restore();
  bgCacheCtx.restore();

  // 4. Static background starfield (~180 stars baked into cache)
  bgCacheCtx.save();
  for (let i = 0; i < 180; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const sr = 0.4 + Math.random() * 1.1;
    const sa = 0.12 + Math.random() * 0.42;
    bgCacheCtx.fillStyle = `rgba(220, 235, 255, ${sa})`;
    bgCacheCtx.beginPath();
    bgCacheCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    bgCacheCtx.fill();
  }
  bgCacheCtx.restore();

  // 5. Subtle edge vignette baked into cache
  const vg = bgCacheCtx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.38,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.78
  );
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  bgCacheCtx.fillStyle = vg;
  bgCacheCtx.fillRect(0, 0, w, h);
}

// ── Initialization & Resize ──
function resize() {
  const rect = canvas.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  mouseX = w / 2;
  mouseY = h / 2;
  canvas.width = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  updatePulsarPositions();
  initTwinkleStars();
  buildBackgroundCache();
}

function updatePulsarPositions() {
  const baseRadius = Math.min(w, h) * 0.056;
  pulsars = PULSAR_POSITIONS.map((fp, i) => {
    const radius = baseRadius + (i % 3) * 3;
    return {
      id: i,
      baseX: fp.px * w,
      baseY: fp.py * h,
      x: fp.px * w,
      y: fp.py * h,
      color: COLORS[i],
      haloSpin: Math.random() * Math.PI * 2,
      radius,
      sprite: buildPulsarCoronaSprite(COLORS[i], radius),
      bloom: 0,
      wilt: 0,
      glow: 0,
      scale: 1,
      scaleVel: 0,
      phase: (i * Math.PI * 2) / 7 + 0.4,
    };
  });
}

function initTwinkleStars() {
  // Keep only 42 lightweight animated twinkling stars in the 60fps loop
  twinkleStars = Array.from({ length: 42 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: 0.8 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 1.4,
  }));
}

function spawnShootingStar() {
  if (shootingStars.length >= 2) return;
  shootingStars.push({
    x: Math.random() * w * 0.8,
    y: Math.random() * h * 0.3,
    vx: 3.4 + Math.random() * 4,
    vy: 1.6 + Math.random() * 2.4,
    life: 0.6 + Math.random() * 0.4,
    maxLife: 0.6 + Math.random() * 0.4,
    length: 45 + Math.random() * 75,
  });
}

function spawnBeamPulse(fromIdx, toIdx, color, speed = 2.6, triggerBloomOnArrive = false) {
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
  if (beamPulses.length >= 6) beamPulses.shift();
  beamPulses.push({
    fromIdx,
    toIdx,
    color: color || "#7eddb5",
    t: 0,
    speed,
    triggerBloomOnArrive,
  });
}

// ── Game Flow ──
function startGame(selectedMode) {
  clearAllTimers();
  modeId = selectedMode in MODES ? selectedMode : "speed";
  mode = MODES[modeId];
  els.modeBadge.textContent = mode.name;

  if (els.leaderboardModal) els.leaderboardModal.classList.add("hidden");
  els.home.classList.add("hidden");
  els.result.classList.add("hidden");
  els.hud.classList.remove("hidden");
  els.comboMeter.classList.remove("hidden");
  els.progressBar.classList.remove("hidden");
  els.soundToggle.classList.add("in-game");
  if (els.timerBar) els.timerBar.classList.add("hidden");

  score = 0;
  combo = 0;
  maxCombo = 0;
  lives = mode.lives;
  round = 0;
  perfects = 0;
  goods = 0;
  misses = 0;
  currentTarget = -1;
  sequence = [];
  beamPulses = [];
  roundClearWave = 0;
  activePowerUpDrop = null;
  activeEffects = { doublePoints: false, slowMotion: false };
  FX.particles.length = 0;
  for (const p of pulsars) {
    p.glow = 0;
    p.bloom = 0;
    p.wilt = 0;
    p.scale = 1;
    p.scaleVel = 0;
  }

  if (lives === Infinity) {
    els.shields.style.display = "none";
  } else {
    els.shields.style.display = "flex";
    els.shields.innerHTML = Array(lives)
      .fill(
        '<span class="shield-icon"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 7v6c0 5.2 3.4 9.9 8 11 4.6-1.1 8-5.8 8-11V7l-8-5z"/></svg></span>'
      )
      .join("");
  }

  renderSeqDots();
  updateHUD();
  updateShields();
  updateBestDisplay();

  FX.ensureAudio();
  FX.startAmbient();

  startCountdown();
}

function returnToHome() {
  clearAllTimers();
  state = "home";
  currentTarget = -1;
  beamPulses = [];
  roundClearWave = 0;
  activePowerUpDrop = null;
  for (const p of pulsars) {
    p.glow = 0;
    p.bloom = 0;
    p.wilt = 0;
    p.scale = 1;
    p.scaleVel = 0;
  }
  FX.stopAmbient();
  els.hud.classList.add("hidden");
  els.comboMeter.classList.add("hidden");
  els.progressBar.classList.add("hidden");
  els.result.classList.add("hidden");
  els.soundToggle.classList.remove("in-game");
  els.home.classList.remove("hidden");
  updateBestDisplay();
}

function startCountdown() {
  state = "countdown";
  countdownValue = 3;
  countdownStart = performance.now();
  setPhase("READY", "");
  if (els.seqDots) els.seqDots.innerHTML = "";
}

function beginPlaying() {
  startNextRound();
}

function startNextRound() {
  const nextRound = round + 1;
  if (nextRound > mode.maxRounds && !mode.endless) {
    endGame(true);
    return;
  }
  round = nextRound;

  const seqLen = mode.startSeqLen + Math.floor((round - 1) * 0.8);
  sequence = [];
  for (let i = 0; i < seqLen; i++) {
    let next;
    do {
      next = Math.floor(Math.random() * pulsars.length);
    } while (next === sequence[sequence.length - 1]);
    sequence.push(next);
  }

  watchIndex = 0;
  replayIndex = 0;
  currentTarget = -1;
  beamPulses = [];
  for (const p of pulsars) {
    p.glow = 0;
    p.bloom = 0;
    p.wilt = 0;
  }

  setPhase("WATCH", "");
  renderSeqDots();
  updateHUD();
  els.progressBar.classList.remove("hidden");
  els.progressFill.style.width = "0%";
  if (els.timerBar) els.timerBar.classList.add("hidden");

  scheduleTimer(() => startWatchPhase(), 750);
}

function setPhase(label, msg = "") {
  if (els.phase.textContent !== label) {
    els.phase.textContent = label;
    els.phase.classList.remove("phase-pop");
    void els.phase.offsetWidth;
    els.phase.classList.add("phase-pop");
  }
  if (els.msg) els.msg.textContent = msg;
}

function renderSeqDots() {
  if (!els.seqDots) return;
  if (!sequence.length || state === "home" || state === "countdown" || state === "ended") {
    els.seqDots.innerHTML = "";
    return;
  }
  els.seqDots.innerHTML = sequence
    .map((_, idx) => {
      let cls = "seq-dot";
      if (state === "watching" && idx < watchIndex) cls += " watch-active";
      else if ((state === "replaying" || state === "between") && idx < replayIndex) cls += " done";
      return `<span class="${cls}"></span>`;
    })
    .join("");
}

function startWatchPhase() {
  state = "watching";
  watchIndex = 0;
  replayIndex = 0;
  currentTarget = -1;
  beamPulses = [];
  if (els.timerBar) els.timerBar.classList.add("hidden");
  for (const p of pulsars) {
    p.glow = 0;
    p.bloom = 0;
    p.wilt = 0;
  }
  setPhase("WATCH", "");
  renderSeqDots();
  showWatchPulsar();
}

function showWatchPulsar() {
  if (watchIndex >= sequence.length) {
    scheduleTimer(() => startReplayPhase(), 650);
    return;
  }
  const currIdx = sequence[watchIndex];
  const pulsar = pulsars[currIdx];
  pulsar.glow = 1;
  pulsar.bloom = 0.78;
  pulsar.scaleVel = 3.2;

  if (watchIndex > 0) {
    spawnBeamPulse(sequence[watchIndex - 1], currIdx, pulsar.color, 3.4);
  }

  FX.playPulsarTone(currIdx);
  FX.playBeat();
  FX.spawn(pulsar.x, pulsar.y, pulsar.color, 7, { speed: 105 });
  FX.spawnRipple(pulsar.x, pulsar.y, pulsar.color, 105, 2);

  watchIndex++;
  renderSeqDots();

  let interval = mode.watchInterval - round * 10;
  if (activeEffects.slowMotion) interval *= 1.5;
  interval = Math.max(210, interval);

  scheduleTimer(() => {
    if (state === "watching") showWatchPulsar();
  }, interval);
}

function startReplayPhase() {
  // Strictly clear all glow/bloom/scale from watch phase so no pulsar hints the answer
  for (const p of pulsars) {
    p.glow = 0;
    p.bloom = 0;
    p.wilt = 0;
    p.scale = 1;
    p.scaleVel = 0;
  }
  beamPulses = [];
  state = "replaying";
  replayIndex = 0;
  currentTarget = sequence[0];
  replayDeadline =
    mode.replayTimeout === Infinity ? Infinity : performance.now() + mode.replayTimeout;
  setPhase("REPLAY", "");
  els.progressFill.style.width = "0%";
  if (els.timerBar) {
    if (mode.replayTimeout === Infinity) els.timerBar.classList.add("hidden");
    else els.timerBar.classList.remove("hidden");
  }
  renderSeqDots();
}

function spawnPowerUpDrop() {
  if (Math.random() > 0.35) return;
  const pData = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
  activePowerUpDrop = {
    ...pData,
    x: w * (0.22 + Math.random() * 0.56),
    y: h * (0.28 + Math.random() * 0.44),
    life: 5500,
    maxLife: 5500,
    spawnTime: performance.now(),
  };
}

function handleCorrectTap(pulsar, speed) {
  pulsar.bloom = 1;
  pulsar.glow = 0;
  pulsar.scaleVel = 4.2;

  if (replayIndex > 0) {
    spawnBeamPulse(sequence[replayIndex - 1], pulsar.id, "#7eddb5", 4.0);
  }

  replayIndex++;
  currentTarget = sequence[replayIndex] ?? -1;

  els.progressFill.style.width = `${(replayIndex / sequence.length) * 100}%`;
  renderSeqDots();

  let pts = 0;
  if (speed < 850 || mode.replayTimeout === Infinity) {
    perfects++;
    combo++;
    pts = Math.round((120 + round * 20) * (1 + combo * 0.1));
    showFeedback("✦ PERFECT", "perfect");
    FX.playPerfect(pulsar.id);
    FX.spawn(pulsar.x, pulsar.y, pulsar.color, 14, { speed: 155 });
    FX.spawnRipple(pulsar.x, pulsar.y, pulsar.color, 175, 2);
  } else {
    goods++;
    combo++;
    pts = Math.round((60 + round * 10) * (1 + combo * 0.05));
    showFeedback("GOOD", "good");
    FX.playGood(pulsar.id);
    FX.spawn(pulsar.x, pulsar.y, pulsar.color, 8);
    FX.spawnRipple(pulsar.x, pulsar.y, pulsar.color, 110, 1);
  }

  if (activeEffects.doublePoints) pts *= 2;
  score += pts;
  maxCombo = Math.max(maxCombo, combo);

  FX.playComboChime(combo);
  if (combo >= 3) FX.shake(combo >= 5 ? 3.5 : 1.8);

  updateHUD();

  if (replayIndex >= sequence.length) {
    handleRoundClear();
  } else if (mode.replayTimeout !== Infinity) {
    replayDeadline = performance.now() + mode.replayTimeout;
  }
}

function handleRoundClear() {
  state = "between";
  currentTarget = -1;
  roundClearWave = 1;
  if (els.timerBar) els.timerBar.classList.add("hidden");

  const bonus = lives === mode.lives && lives !== Infinity ? 200 : 0;
  if (bonus > 0) score += activeEffects.doublePoints ? bonus * 2 : bonus;

  combo++;
  maxCombo = Math.max(maxCombo, combo);

  setPhase("SYNCED", "");
  FX.playRoundClear();
  FX.spawnCelebration(w, h);
  FX.spawnRipple(w / 2, h / 2, "#7eddb5", Math.min(w, h) * 0.42, 2);
  showFeedback(bonus > 0 ? "✦ FLAWLESS" : "✦ SYNCED", "perfect");

  activeEffects.doublePoints = false;
  activeEffects.slowMotion = false;

  spawnPowerUpDrop();
  updateHUD();

  scheduleTimer(() => {
    if (state === "between") startNextRound();
  }, 1350);
}

function handleWrongTap(pulsar) {
  misses++;
  combo = 0;
  currentTarget = -1;
  if (lives !== Infinity) lives--;

  if (pulsar) {
    pulsar.wilt = 1;
    pulsar.scaleVel = -2.8;
  }
  if (els.timerBar) els.timerBar.classList.add("hidden");

  showFeedback("✕ MISS", "miss");
  FX.playMiss();
  FX.shake(6);
  FX.spawnRipple(pulsar ? pulsar.x : mouseX, pulsar ? pulsar.y : mouseY, "#ff7b7b", 180, 2);

  updateHUD();
  updateShields();

  if (lives <= 0) {
    endGame(false);
    return;
  }

  setPhase("WATCH", "");
  state = "watching";
  els.progressFill.style.width = "0%";
  scheduleTimer(() => startWatchPhase(), 800);
}

function handleTimeout() {
  misses++;
  combo = 0;
  currentTarget = -1;
  if (lives !== Infinity) lives--;
  if (els.timerBar) els.timerBar.classList.add("hidden");

  showFeedback("✕ LATE", "miss");
  FX.playMiss();
  FX.shake(4);

  updateHUD();
  updateShields();

  if (lives <= 0) {
    endGame(false);
    return;
  }

  setPhase("WATCH", "");
  state = "watching";
  els.progressFill.style.width = "0%";
  scheduleTimer(() => startWatchPhase(), 800);
}

function activatePowerUp(p) {
  FX.playPowerUp();
  showPowerUpNotif(`${p.symbol} ${p.name}`);

  if (p.id === "freeze") {
    if (mode.replayTimeout !== Infinity) replayDeadline += 5000;
  } else if (p.id === "shield") {
    if (lives !== Infinity && lives < mode.lives) {
      lives++;
      updateShields();
    }
  } else if (p.id === "double") {
    activeEffects.doublePoints = true;
  } else if (p.id === "slow") {
    activeEffects.slowMotion = true;
  }

  FX.spawn(p.x, p.y, "#f5d76e", 20, { speed: 180, life: 0.85 });
  FX.spawnRipple(p.x, p.y, "#f5d76e", 130, 2);
  activePowerUpDrop = null;
}

function animateScoreCounter(el, targetScore) {
  if (!el) return;
  const start = performance.now();
  const dur = 680;
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(targetScore * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function endGame(won) {
  clearAllTimers();
  state = "ended";
  currentTarget = -1;
  FX.stopAmbient();
  els.hud.classList.add("hidden");
  els.comboMeter.classList.add("hidden");
  els.progressBar.classList.add("hidden");
  if (els.timerBar) els.timerBar.classList.add("hidden");
  els.soundToggle.classList.remove("in-game");

  const currentBest = bestScores[modeId] || 0;
  const leaderboardEntry = saveLeaderboardEntry(won);
  const isNewBest = score > currentBest;
  if (isNewBest) {
    bestScores[modeId] = score;
    localStorage.setItem("lumina-best", JSON.stringify(bestScores));
  }
  updateBestDisplay(leaderboardEntry.id);

  const totalAttempts = perfects + goods + misses;
  const accuracy = totalAttempts > 0 ? Math.round(((perfects + goods) / totalAttempts) * 100) : 100;
  let rank = "C";
  if (won && accuracy >= 95) rank = "S";
  else if (accuracy >= 88 && round >= 5) rank = "S";
  else if (accuracy >= 78 && round >= 3) rank = "A";
  else if (accuracy >= 60) rank = "B";

  if (els.resultRank) els.resultRank.textContent = rank;
  els.resultTitle.textContent = won ? "Constellation Synced" : `Round ${round}`;
  els.resultText.textContent = isNewBest
    ? "★ New Best"
    : `Best ${(bestScores[modeId] || 0).toLocaleString()}`;
  els.rPerfect.textContent = perfects;
  if (els.rGood) els.rGood.textContent = goods;
  if (els.rAccuracy) els.rAccuracy.textContent = `${accuracy}%`;
  els.rCombo.textContent = `x${maxCombo}`;

  scheduleTimer(() => {
    els.result.classList.remove("hidden");
    animateScoreCounter(els.resultScoreBig, score);
  }, 500);
}

// ── UI Helpers ──
function updateHUD() {
  const currentScore = parseInt(els.score.textContent, 10) || 0;
  if (currentScore !== score) {
    els.score.textContent = score;
    els.score.classList.add("bump");
    setTimeout(() => els.score.classList.remove("bump"), 160);
  }

  els.combo.textContent = `x${combo}`;
  els.round.textContent = round;

  if (els.comboPill) {
    els.comboPill.style.opacity = combo > 0 ? "1" : "0.45";
    els.comboPill.style.transform = combo >= 3 ? "scale(1.06)" : "scale(1)";
  }

  const comboPerc = Math.min(100, (combo / 10) * 100);
  els.comboFill.style.width = `${comboPerc}%`;
}

function updateShields() {
  if (lives === Infinity) return;
  const icons = els.shields.querySelectorAll(".shield-icon");
  icons.forEach((el, i) => {
    if (i >= lives) el.classList.add("lost");
    else el.classList.remove("lost");
  });
}

function showFeedback(text, type) {
  clearTimeout(feedbackTimer);
  els.feedback.textContent = text;
  els.feedback.className = `feedback ${type} show`;
  feedbackTimer = setTimeout(() => {
    els.feedback.classList.remove("show");
    els.feedback.classList.add("hidden");
  }, 620);
}

function showPowerUpNotif(text) {
  els.powerUpNotif.textContent = text;
  els.powerUpNotif.classList.remove("hidden");
  setTimeout(() => els.powerUpNotif.classList.add("hidden"), 1700);
}

function saveLeaderboardEntry(won) {
  if (!Array.isArray(leaderboards[modeId])) leaderboards[modeId] = [];

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    score,
    round,
    combo: maxCombo,
    perfects,
    goods,
    misses,
    won,
    createdAt: Date.now(),
  };

  leaderboards[modeId].push(entry);
  leaderboards[modeId] = leaderboards[modeId]
    .sort((a, b) => b.score - a.score || b.round - a.round || b.combo - a.combo || b.createdAt - a.createdAt)
    .slice(0, 5);

  localStorage.setItem("lumina-leaderboard", JSON.stringify(leaderboards));
  return entry;
}

function formatScore(value) {
  return Number(value || 0).toLocaleString();
}

function renderLeaderboardList(listEl, entries, activeId = null) {
  if (!listEl) return;

  if (!entries || entries.length === 0) {
    listEl.innerHTML = '<li class="leaderboard-empty">—</li>';
    return;
  }

  listEl.innerHTML = entries
    .map(
      (entry, index) => `
    <li class="${entry.id === activeId ? "is-current" : ""}">
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-main">
        <strong>${formatScore(entry.score)}</strong>
        <em>R${entry.round} · x${entry.combo}</em>
      </span>
    </li>
  `
    )
    .join("");
}

function renderLeaderboards(activeId = null) {
  renderLeaderboardList(els.homeLeaderboardSpeed, leaderboards.speed, activeId);
  renderLeaderboardList(els.homeLeaderboardEndless, leaderboards.endless, activeId);
  renderLeaderboardList(els.resultLeaderboard, leaderboards[modeId], activeId);
}

function updateBestDisplay(activeId = null) {
  const highest = Math.max(0, bestScores.speed || 0, bestScores.endless || 0, bestScores.zen || 0);
  if (els.bestDisplay) {
    els.bestDisplay.textContent = highest.toLocaleString();
  }
  ["speed", "endless", "zen"].forEach((key) => {
    const badge = document.getElementById(`best-${key}`);
    if (badge) {
      badge.textContent = `★ ${(bestScores[key] || 0).toLocaleString()}`;
    }
  });
  renderLeaderboards(activeId);
}

// ── Input ──
function getPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function findPulsarAt(pt) {
  for (let i = pulsars.length - 1; i >= 0; i--) {
    const p = pulsars[i];
    if (Math.hypot(pt.x - p.x, pt.y - p.y) < p.radius + 28) return p;
  }
  return null;
}

canvas.addEventListener("pointermove", (e) => {
  const pt = getPoint(e);
  mouseX = pt.x;
  mouseY = pt.y;
  const hovered = findPulsarAt(pt);
  hoveredPulsarId = hovered ? hovered.id : -1;
});

function onTap(e) {
  if (e.target.closest("button")) return;
  e.preventDefault();
  FX.ensureAudio();

  const pt = getPoint(e);

  // Check power-up tap
  if (activePowerUpDrop && (state === "replaying" || state === "between")) {
    if (Math.hypot(pt.x - activePowerUpDrop.x, pt.y - activePowerUpDrop.y) < 42) {
      activatePowerUp(activePowerUpDrop);
      return;
    }
  }

  // Visual tap feedback everywhere
  if (state === "replaying" || state === "watching" || state === "between") {
    FX.spawnRipple(pt.x, pt.y, "rgba(255,255,255,0.25)", 55, 1);
  }

  if (state !== "replaying") return;

  const tapped = findPulsarAt(pt);
  if (!tapped) return;

  const expected = sequence[replayIndex];
  let speed = 0;
  if (mode.replayTimeout !== Infinity) {
    speed = performance.now() - (replayDeadline - mode.replayTimeout);
  }

  if (tapped.id === expected) {
    handleCorrectTap(tapped, speed);
  } else {
    handleWrongTap(tapped);
  }
}

canvas.addEventListener("pointerdown", onTap);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (els.leaderboardModal && !els.leaderboardModal.classList.contains("hidden")) {
      els.leaderboardModal.classList.add("hidden");
      return;
    }
    if (state !== "home") {
      returnToHome();
      return;
    }
  }
  if (state !== "replaying") return;
  const num = Number(e.key);
  if (num >= 1 && num <= pulsars.length) {
    const tapped = pulsars[num - 1];
    const expected = sequence[replayIndex];
    let speed = 0;
    if (mode.replayTimeout !== Infinity) {
      speed = performance.now() - (replayDeadline - mode.replayTimeout);
    }
    if (tapped.id === expected) handleCorrectTap(tapped, speed);
    else handleWrongTap(tapped);
  }
});

// Event Listeners
els.modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const sMode = card.getAttribute("data-mode");
    FX.ensureAudio();
    startGame(sMode);
  });
});

els.retryBtn.addEventListener("click", () => {
  FX.ensureAudio();
  startGame(modeId);
});

els.homeBtn.addEventListener("click", returnToHome);
if (els.hudHomeBtn) {
  els.hudHomeBtn.addEventListener("click", returnToHome);
}

if (els.leaderboardToggle && els.leaderboardModal) {
  els.leaderboardToggle.addEventListener("click", () => {
    els.leaderboardModal.classList.remove("hidden");
  });
}
if (els.leaderboardClose && els.leaderboardModal) {
  els.leaderboardClose.addEventListener("click", () => {
    els.leaderboardModal.classList.add("hidden");
  });
}
if (els.leaderboardModal) {
  els.leaderboardModal.addEventListener("click", (e) => {
    if (e.target === els.leaderboardModal) {
      els.leaderboardModal.classList.add("hidden");
    }
  });
}

els.soundToggle.addEventListener("click", () => {
  FX.soundEnabled = !FX.soundEnabled;
  els.soundToggle.innerHTML = FX.soundEnabled
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>';
  if (FX.soundEnabled && state !== "home" && state !== "ended") FX.startAmbient();
  else FX.stopAmbient();
});

// ── Update ──
function update(dt, now) {
  FX.updateShake(dt);
  FX.updateRipples(dt);
  FX.updateParticles(dt);

  // Smooth camera zoom & parallax interpolation
  const targetZoom =
    state === "home"
      ? 0.94
      : state === "watching"
      ? 1.03
      : state === "between"
      ? 1.05
      : 1.0;
  camZoom += (targetZoom - camZoom) * Math.min(1, dt * 4.5);

  const targetPanX = ((mouseX || w / 2) - w / 2) * -0.014;
  const targetPanY = ((mouseY || h / 2) - h / 2) * -0.014;
  camPanX += (targetPanX - camPanX) * Math.min(1, dt * 5);
  camPanY += (targetPanY - camPanY) * Math.min(1, dt * 5);

  if (roundClearWave > 0) {
    roundClearWave = Math.max(0, roundClearWave - dt * 0.9);
  }

  // Autonomous ambient constellation beams on Home screen
  if (state === "home" && pulsars.length === 7 && now > nextAmbientBeamAt) {
    const a = Math.floor(Math.random() * pulsars.length);
    const b = (a + 1 + Math.floor(Math.random() * (pulsars.length - 1))) % pulsars.length;
    spawnBeamPulse(a, b, pulsars[b].color, 1.35, true);
    nextAmbientBeamAt = now + 1100 + Math.random() * 900;
  }

  // Update travelling photon beams
  for (let i = beamPulses.length - 1; i >= 0; i--) {
    const bp = beamPulses[i];
    bp.t += dt * bp.speed;
    if (bp.t >= 1) {
      if (bp.triggerBloomOnArrive && state === "home" && pulsars[bp.toIdx]) {
        pulsars[bp.toIdx].bloom = 0.5;
        pulsars[bp.toIdx].scaleVel = 1.4;
      }
      beamPulses.splice(i, 1);
    }
  }

  // Zero-G Pulsar Drift + Spring Physics
  for (const p of pulsars) {
    const driftRadius = state === "home" ? 6 : 3;
    p.x = p.baseX + Math.sin(now * 0.0011 + p.phase) * driftRadius;
    p.y = p.baseY + Math.cos(now * 0.0014 + p.phase * 1.3) * driftRadius;

    // Elastic spring for p.scale
    const springForce = (1 - p.scale) * 38;
    p.scaleVel = (p.scaleVel + springForce * dt) * Math.pow(0.08, dt);
    p.scale = Math.max(0.75, Math.min(1.4, p.scale + p.scaleVel * dt));

    p.bloom = Math.max(0, p.bloom - dt * 1.5);
    p.wilt = Math.max(0, p.wilt - dt * 1.8);
    // Always decay glow uniformly — never hold glow on currentTarget
    if (p.glow > 0) p.glow = Math.max(0, p.glow - dt * 2.5);
  }

  // Replay timeout & timer bar update
  if (state === "replaying" && mode.replayTimeout !== Infinity) {
    const remaining = Math.max(0, replayDeadline - now);
    const pct = Math.min(100, Math.max(0, (remaining / mode.replayTimeout) * 100));
    if (els.timerFill) {
      els.timerFill.style.width = `${pct}%`;
      if (pct < 32) els.timerFill.classList.add("urgent");
      else els.timerFill.classList.remove("urgent");
    }
    if (now > replayDeadline) {
      handleTimeout();
    }
  }

  // Shooting stars
  if (Math.random() < 0.003) spawnShootingStar();
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.life -= dt;
    s.x += s.vx;
    s.y += s.vy;
    if (s.life <= 0) shootingStars.splice(i, 1);
  }

  // Power-up
  if (activePowerUpDrop) {
    activePowerUpDrop.life -= dt * 1000;
    activePowerUpDrop.y += Math.sin(now * 0.003) * 0.5;
    if (activePowerUpDrop.life <= 0) activePowerUpDrop = null;
  }

  // Countdown
  if (state === "countdown") {
    const elapsed = now - countdownStart;
    countdownValue = 3 - Math.floor(elapsed / 700);
    if (countdownValue <= 0) {
      state = "between";
      beginPlaying();
    }
  }
}

// ── Fast Hardware-Accelerated Render ──
function drawTwinkleStars(now) {
  ctx.save();
  ctx.fillStyle = "#e2eeff";
  for (const s of twinkleStars) {
    ctx.globalAlpha = 0.25 + Math.sin(now * 0.0012 * s.speed + s.phase) * 0.22;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShootingStars() {
  if (!shootingStars.length) return;
  ctx.save();
  for (const s of shootingStars) {
    const t = s.life / s.maxLife;
    const tailX = s.x - s.vx * s.length * 0.14;
    const tailY = s.y - s.vy * s.length * 0.14;
    ctx.globalAlpha = t * 0.75;
    ctx.strokeStyle = "#dce8ff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawConstellations(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Base faint lines between nearby pulsars
  const maxDist = Math.min(w, h) * 0.45;
  const baseLineOpacity = state === "home" ? 0.08 : 0.055;
  ctx.strokeStyle = `rgba(180, 210, 235, ${baseLineOpacity})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < pulsars.length; i++) {
    for (let j = i + 1; j < pulsars.length; j++) {
      const a = pulsars[i],
        b = pulsars[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) <= maxDist) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    }
  }
  ctx.stroke();

  // Watch phase trail
  if (state === "watching" && watchIndex > 1) {
    ctx.beginPath();
    ctx.moveTo(pulsars[sequence[0]].x, pulsars[sequence[0]].y);
    for (let i = 1; i < watchIndex; i++) {
      ctx.lineTo(pulsars[sequence[i]].x, pulsars[sequence[i]].y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]);
    ctx.lineDashOffset = -now * 0.05;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Replay phase completed trail (zero shadowBlur — layered stroke instead)
  if ((state === "replaying" || state === "between") && replayIndex > 1) {
    ctx.beginPath();
    ctx.moveTo(pulsars[sequence[0]].x, pulsars[sequence[0]].y);
    for (let i = 1; i < replayIndex; i++) {
      ctx.lineTo(pulsars[sequence[i]].x, pulsars[sequence[i]].y);
    }
    const col = roundClearWave > 0 ? "rgba(245, 215, 110," : "rgba(126, 221, 181,";
    ctx.strokeStyle = `${col} 0.24)`;
    ctx.lineWidth = 7 + roundClearWave * 4;
    ctx.stroke();

    ctx.strokeStyle = `${col} 0.78)`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // Travelling photon comets along constellation edges (zero shadowBlur)
  for (const bp of beamPulses) {
    const a = pulsars[bp.fromIdx];
    const b = pulsars[bp.toIdx];
    if (!a || !b) continue;
    const t = Math.min(1, bp.t);
    const tailT = Math.max(0, t - 0.26);
    const x1 = a.x + (b.x - a.x) * tailT;
    const y1 = a.y + (b.y - a.y) * tailT;
    const x2 = a.x + (b.x - a.x) * t;
    const y2 = a.y + (b.y - a.y) * t;

    ctx.strokeStyle = bp.color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = bp.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x2, y2, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x2, y2, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPulsar(p, now) {
  // Strictly neutral during replay: energy depends ONLY on p.bloom and p.glow (never currentTarget)
  const bloomScale = (1 + p.bloom * 0.34) * p.scale;
  const wiltScale = p.wilt > 0 ? Math.max(0, 1 - p.wilt * 0.5) : 1;
  const idleScale = 1 + Math.sin(now * 0.0022 + p.phase) * 0.04;
  const energy = Math.max(p.bloom, p.glow);
  const isHovered = state === "replaying" && hoveredPulsarId === p.id;
  const homeDim = state === "home" ? 0.6 : 1;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(bloomScale * wiltScale * idleScale, bloomScale * wiltScale * idleScale);

  // 1. Pre-rendered corona sprite (zero per-frame gradient allocation, zero shadowBlur)
  if (p.sprite) {
    const spriteR = p.radius * (1.85 + energy * 0.7);
    ctx.globalAlpha = (p.wilt > 0 ? 0.14 : 0.52 + energy * 0.38) * homeDim;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(p.sprite, -spriteR, -spriteR, spriteR * 2, spriteR * 2);
    ctx.globalCompositeOperation = "source-over";
  }

  // 2. Two counter-rotating orbital rings
  for (let i = 0; i < 2; i++) {
    const ringScale = 1 + i * 0.22;
    ctx.save();
    ctx.rotate(now * (0.00042 + i * 0.0002) * (i % 2 ? -1 : 1) + p.haloSpin + i * 0.9);
    ctx.globalAlpha = (p.wilt > 0 ? 0.08 : 0.25 + energy * 0.3) * homeDim;
    ctx.strokeStyle = i === 1 ? "rgba(255,255,255,0.6)" : p.color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.1 * ringScale, p.radius * 0.35 * ringScale, 0, 0.2, Math.PI * 1.75);
    ctx.stroke();
    ctx.restore();
  }

  if (isHovered) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.16, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.bloom > 0) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5 + p.bloom * 2;
    ctx.globalAlpha = p.bloom * 0.7 * homeDim;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 10 + (1 - p.bloom) * 44, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. 4 lightweight orbiting moons (no shadowBlur!)
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    const a = now * (0.00045 + i * 0.00006) * (i % 2 ? -1 : 1) + p.phase + i * 1.57;
    const ox = Math.cos(a) * p.radius * (0.9 + (i % 2) * 0.16);
    const oy = Math.sin(a) * p.radius * (0.36 + (i % 2) * 0.1);
    ctx.globalAlpha = (p.wilt > 0 ? 0.12 : 0.65) * homeDim;
    ctx.beginPath();
    ctx.arc(ox, oy, 1.4 + energy * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Crisp 2-layer core (colored outer disc + white hot center — zero shadowBlur)
  const coreRadius = p.radius * (0.34 + energy * 0.12);
  ctx.globalAlpha = (p.wilt > 0 ? 0.35 : 0.92) * homeDim;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-coreRadius * 0.18, -coreRadius * 0.18, coreRadius * 0.52, 0, Math.PI * 2);
  ctx.fill();

  if (state !== "home") {
    ctx.globalAlpha = p.wilt > 0 ? 0.2 : 0.75;
    ctx.fillStyle = "#060b16";
    ctx.font = `800 ${Math.max(10, p.radius * 0.32)}px 'Outfit', system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(p.id + 1), 0, 1);
  }

  ctx.restore();
}

function drawPowerUp(now) {
  if (!activePowerUpDrop) return;
  const p = activePowerUpDrop;
  const alpha = Math.min(1, p.life / 500);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(245, 215, 110, 0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, 26 + Math.sin(now * 0.005) * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(12, 18, 32, 0.9)";
  ctx.beginPath();
  ctx.arc(0, 0, 19, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5d76e";
  ctx.font = "700 18px 'Outfit', system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.symbol || "★", 0, 1);

  ctx.strokeStyle = "rgba(245, 215, 110, 0.85)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = now * 0.02;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawReplayIndicators(now) {
  if (state !== "replaying") return;
  ctx.save();

  for (let i = 0; i < replayIndex; i++) {
    const p = pulsars[sequence[i]];
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#7eddb5";
    ctx.font = `800 ${p.radius * 0.5}px 'Outfit', system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", p.x, p.y - p.radius - 12);
  }

  for (const p of pulsars) {
    const pulse = Math.sin(now * 0.004 + p.id) * 0.05 + 0.09;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCountdown(now) {
  if (state !== "countdown") return;
  const elapsed = (now - countdownStart) % 700;
  const scale = 1 + (1 - elapsed / 700) * 0.45;
  const alpha = 1 - elapsed / 700;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#7eddb5";
  ctx.font = `800 ${76 * scale}px 'Outfit', system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.max(1, countdownValue), w / 2, h / 2);
  ctx.restore();
}

function render(now) {
  ctx.save();

  if (FX.shakeX !== 0 || FX.shakeY !== 0) {
    ctx.translate(FX.shakeX, FX.shakeY);
  }

  // 1. Blit pre-rendered cosmic sky + nebulae + static stars + vignette in a single GPU drawImage call
  ctx.drawImage(bgCacheCanvas, 0, 0, w, h);

  // 2. Lightweight twinkling foreground stars & occasional shooting star
  drawTwinkleStars(now);
  drawShootingStars();

  // 3. Apply smooth camera zoom & parallax to the constellation stage
  ctx.save();
  ctx.translate(w / 2 + camPanX, h / 2 + camPanY);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-w / 2, -h / 2);

  drawConstellations(now);
  FX.drawRipples(ctx);
  for (const p of pulsars) drawPulsar(p, now);
  drawPowerUp(now);
  drawReplayIndicators(now);
  FX.drawParticles(ctx);

  ctx.restore();

  drawCountdown(now);

  ctx.restore();
}

// ── Game Loop ──
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt, now);
  render(now);
  requestAnimationFrame(loop);
}

// ── Init ──
window.addEventListener("resize", resize);
updateBestDisplay();
resize();
requestAnimationFrame(loop);
