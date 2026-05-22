/* ═══════════════════════════════════════════════════════
   Lumina — Rhythm-Spatial Memory Game (Overhaul)
   ═══════════════════════════════════════════════════════ */

const canvas = document.getElementById("garden");
const ctx = canvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// DOM refs
const els = {
  home: document.getElementById("home"),
  hud: document.getElementById("hud"),
  round: document.getElementById("roundVal"),
  score: document.getElementById("scoreVal"),
  combo: document.getElementById("comboVal"),
  shields: document.getElementById("shields"),
  phase: document.getElementById("phaseLabel"),
  msg: document.getElementById("phaseMsg"),
  feedback: document.getElementById("feedback"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  resultIcon: document.getElementById("resultIcon"),
  rPerfect: document.getElementById("rPerfect"),
  rGood: document.getElementById("rGood"),
  rMiss: document.getElementById("rMiss"),
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
  homeLeaderboardSpeed: document.getElementById("homeLeaderboardSpeed"),
  homeLeaderboardEndless: document.getElementById("homeLeaderboardEndless"),
  resultLeaderboard: document.getElementById("resultLeaderboard"),
  resultLeaderboardTitle: document.getElementById("resultLeaderboardTitle"),
};

// ── Constants ──
const COLORS = ["#ff7b7b", "#b8a9e8", "#f5d76e", "#7eddb5", "#ffb5c5", "#87ceeb", "#ffab76"];
const PULSAR_POSITIONS = [
  { px: 0.20, py: 0.30 },
  { px: 0.50, py: 0.18 },
  { px: 0.80, py: 0.30 },
  { px: 0.14, py: 0.58 },
  { px: 0.50, py: 0.55 },
  { px: 0.86, py: 0.58 },
  { px: 0.50, py: 0.82 },
];

const MODES = {
  speed: {
    name: "Challenge",
    maxRounds: 15,
    lives: 3,
    watchInterval: 260,
    replayTimeout: 3000,
    startSeqLen: 4,
    endless: false
  },
  endless: {
    name: "Endless",
    maxRounds: Infinity,
    lives: 3,
    watchInterval: 360,
    replayTimeout: 5500,
    startSeqLen: 3,
    endless: true
  }
};

const POWER_UPS = [
  { id: 'freeze', icon: '<svg style="display:inline-block; vertical-align:middle; width: 1.2em; height: 1.2em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 20-2.5-2.5L5 20"/><path d="M12 22v-6"/><path d="m14 20 2.5-2.5L19 20"/><path d="m18 14 2.5 2.5L20 19"/><path d="M22 12h-6"/><path d="m18 10 2.5-2.5L20 5"/><path d="m14 4 2.5 2.5L19 4"/><path d="M12 2v6"/><path d="m10 4-2.5 2.5L5 4"/><path d="m6 10-2.5-2.5L4 5"/><path d="M2 12h6"/><path d="m6 14-2.5 2.5L4 19"/></svg>', name: 'Time Freeze' },
  { id: 'shield', icon: '<svg style="display:inline-block; vertical-align:middle; width: 1.2em; height: 1.2em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>', name: 'Shield Restore' },
  { id: 'double', icon: '<svg style="display:inline-block; vertical-align:middle; width: 1.2em; height: 1.2em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>', name: 'Double Points' },
  { id: 'slow', icon: '<svg style="display:inline-block; vertical-align:middle; width: 1.2em; height: 1.2em;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>', name: 'Slow Motion' }
];

// ── State ──
let state = "home"; // home | countdown | watching | replaying | between | ended
let modeId = "speed";
let mode = MODES.speed;
let pulsars = [];
let bgParticles = [];
let stars = [];
let shootingStars = [];
let nebulaSeeds = [];
let cosmicDust = [];
let galaxyBands = [];
let activePowerUpDrop = null;
let activeEffects = { doublePoints: false, slowMotion: false };

let score = 0;
let combo = 0;
let maxCombo = 0;
let lives = 5;
let round = 0;
let sequence = [];
let watchIndex = 0;
let replayIndex = 0;
let watchTimer = 0;
let replayDeadline = 0;
let perfects = 0;
let goods = 0;
let misses = 0;
let currentTarget = -1;
let countdownValue = 3;
let countdownStart = 0;
let feedbackTimer = null;
let w = 0, h = 0;
let mouseX = 0, mouseY = 0;

// Load best scores
const bestScores = loadStoredJson("lumina-best", {});
const leaderboards = loadStoredJson("lumina-leaderboard", { speed: [], endless: [] });

function loadStoredJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

// ── Initialization & Resize ──
function resize() {
  const rect = canvas.getBoundingClientRect();
  w = rect.width;
  h = rect.height;
  canvas.width = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  updatePulsarPositions();
  initBgParticles();
  initStars();
  initNebulae();
  initCosmicDust();
  initGalaxyBands();
}

function updatePulsarPositions() {
  const baseRadius = Math.min(w, h) * 0.055;
  pulsars = PULSAR_POSITIONS.map((fp, i) => ({
    id: i,
    x: fp.px * w,
    y: fp.py * h,
    color: COLORS[i],
    rotSpeed1: (Math.random() * 0.5 + 0.5) * (i % 2 === 0 ? 1 : -1),
    rotSpeed2: (Math.random() * 0.5 + 0.5) * (i % 2 === 0 ? -1 : 1),
    haloSpin: Math.random() * Math.PI * 2,
    radius: baseRadius + (i % 3) * 4,
    bloom: 0,
    wilt: 0,
    glow: 0,
    scale: 1,
    phase: Math.random() * Math.PI * 2
  }));
}

function initBgParticles() {
  const count = Math.floor((w * h) / 12000);
  bgParticles = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: 1 + Math.random() * 2.5,
    speed: 0.15 + Math.random() * 0.35,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.3,
  }));
}

function initStars() {
  const count = Math.floor((w * h) / 2800);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: 0.3 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.5,
    hue: Math.random() > 0.7 ? (200 + Math.random() * 60) : (30 + Math.random() * 30),
  }));
}

function initNebulae() {
  nebulaSeeds = Array.from({ length: 5 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    rx: 80 + Math.random() * 260,
    ry: 60 + Math.random() * 180,
    hue: [260, 320, 200, 170, 30][Math.floor(Math.random() * 5)],
    alpha: 0.025 + Math.random() * 0.035,
    drift: (Math.random() - 0.5) * 0.08,
    phase: Math.random() * Math.PI * 2,
  }));
}

function initCosmicDust() {
  const count = Math.floor((w * h) / 18000);
  cosmicDust = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 14 + Math.random() * 42,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.03 - Math.random() * 0.08,
    hue: [170, 205, 255, 315, 38][Math.floor(Math.random() * 5)],
    alpha: 0.018 + Math.random() * 0.04,
    phase: Math.random() * Math.PI * 2,
  }));
}

function initGalaxyBands() {
  galaxyBands = Array.from({ length: 4 }, (_, i) => ({
    offset: (i - 1.5) * 34,
    width: 54 + i * 22,
    alpha: 0.018 + i * 0.006,
    hue: [204, 258, 178, 38][i],
    phase: Math.random() * Math.PI * 2,
  }));
}

function spawnShootingStar() {
  shootingStars.push({
    x: Math.random() * w * 0.8,
    y: Math.random() * h * 0.3,
    vx: 3 + Math.random() * 4,
    vy: 1.5 + Math.random() * 2.5,
    life: 0.6 + Math.random() * 0.5,
    maxLife: 0.6 + Math.random() * 0.5,
    length: 40 + Math.random() * 80,
  });
}

// ── Game Flow ──
function startGame(selectedMode) {
  modeId = selectedMode;
  mode = MODES[modeId];
  els.modeBadge.textContent = mode.name;
  
  els.home.classList.add("hidden");
  els.result.classList.add("hidden");
  els.hud.classList.remove("hidden");
  els.comboMeter.classList.remove("hidden");
  els.progressBar.classList.remove("hidden");
  els.soundToggle.classList.add("in-game");
  
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
  activePowerUpDrop = null;
  activeEffects = { doublePoints: false, slowMotion: false };
  FX.particles.length = 0;
  
  if (lives === Infinity) {
    els.shields.style.display = 'none';
  } else {
    els.shields.style.display = 'flex';
    // Regenerate shield icons if needed based on mode.lives
    els.shields.innerHTML = Array(lives).fill('<span class="shield-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></span>').join('');
  }
  
  updateHUD();
  updateShields();
  updateBestDisplay();
  
  FX.ensureAudio();
  FX.startAmbient();
  
  startCountdown();
}

function startCountdown() {
  state = "countdown";
  countdownValue = 3;
  countdownStart = performance.now();
  els.phase.textContent = "Get Ready";
  els.msg.textContent = mode.name + " Mode";
}

function beginPlaying() {
  startNextRound();
}

function startNextRound() {
  const nextRound = round + 1;
  if (nextRound > mode.maxRounds && !mode.endless) { endGame(true); return; }
  round = nextRound;
  
  const seqLen = mode.startSeqLen + Math.floor((round - 1) * 0.8);
  sequence = [];
  for (let i = 0; i < seqLen; i++) {
    let next;
    do { next = Math.floor(Math.random() * pulsars.length); }
    while (next === sequence[sequence.length - 1]);
    sequence.push(next);
  }
  
  watchIndex = 0;
  setPhase(`Round ${round}`, `Watch the sequence — ${seqLen} blooms`);
  updateHUD();
  els.progressBar.classList.remove("hidden");
  els.progressFill.style.width = "0%";
  
  setTimeout(() => startWatchPhase(), 800);
}

function setPhase(label, msg) {
  els.phase.textContent = label;
  els.msg.textContent = msg;
}

function startWatchPhase() {
  state = "watching";
  watchIndex = 0;
  watchTimer = performance.now();
  showWatchPulsar();
}

function showWatchPulsar() {
  if (watchIndex >= sequence.length) {
    setTimeout(() => startReplayPhase(), 600);
    return;
  }
  const pulsar = pulsars[sequence[watchIndex]];
  pulsar.glow = 1;
  pulsar.bloom = 0.7;
  
  FX.playPulsarTone(sequence[watchIndex]);
  FX.playBeat();
  FX.spawn(pulsar.x, pulsar.y, pulsar.color, 6);
  
  watchIndex++;
  
  let interval = mode.watchInterval - (round * 10);
  if (activeEffects.slowMotion) interval *= 1.5;
  interval = Math.max(200, interval);
  
  setTimeout(() => {
    if (state === "watching") showWatchPulsar();
  }, interval);
}

function startReplayPhase() {
  state = "replaying";
  replayIndex = 0;
  currentTarget = sequence[0];
  replayDeadline = mode.replayTimeout === Infinity ? Infinity : performance.now() + mode.replayTimeout;
  setPhase("Your turn", `Reconstruct the sequence — ${replayIndex}/${sequence.length}`);
  els.progressFill.style.width = "0%";
}

function spawnPowerUpDrop() {
  if (Math.random() > 0.3) return; // 30% chance
  const pData = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
  activePowerUpDrop = {
    ...pData,
    x: w * (0.2 + Math.random() * 0.6),
    y: h * (0.2 + Math.random() * 0.6),
    life: 5000,
    maxLife: 5000,
    spawnTime: performance.now()
  };
}

function handleCorrectTap(pulsar, speed) {
  pulsar.bloom = 1;
  pulsar.glow = 0;
  replayIndex++;
  currentTarget = sequence[replayIndex] ?? -1;
  
  // Progress bar
  els.progressFill.style.width = `${(replayIndex / sequence.length) * 100}%`;

  let pts = 0;
  if (speed < 800 || mode.replayTimeout === Infinity) {
    perfects++;
    combo++;
    pts = Math.round((120 + round * 20) * (1 + combo * 0.1));
    showFeedback("Perfect!", "perfect");
    FX.playPerfect(pulsar.id);
    FX.spawn(pulsar.x, pulsar.y, pulsar.color, 18, { speed: 150 });
    FX.spawnRipple(pulsar.x, pulsar.y, pulsar.color, 180);
  } else {
    goods++;
    combo++;
    pts = Math.round((60 + round * 10) * (1 + combo * 0.05));
    showFeedback("Good", "good");
    FX.playGood(pulsar.id);
    FX.spawn(pulsar.x, pulsar.y, pulsar.color, 8);
    FX.spawnRipple(pulsar.x, pulsar.y, pulsar.color, 100);
  }

  if (activeEffects.doublePoints) pts *= 2;
  score += pts;
  maxCombo = Math.max(maxCombo, combo);
  
  FX.playComboChime(combo);
  if (combo >= 3) FX.shake(combo >= 5 ? 4 : 2);

  setPhase("Your turn", `${replayIndex}/${sequence.length}`);
  updateHUD();

  if (replayIndex >= sequence.length) {
    handleRoundClear();
  } else {
    if (mode.replayTimeout !== Infinity) {
      replayDeadline = performance.now() + mode.replayTimeout;
    }
  }
}

function handleRoundClear() {
  state = "between";
  currentTarget = -1;
  const bonus = lives === mode.lives && lives !== Infinity ? 200 : 0;
  if (bonus > 0) score += (activeEffects.doublePoints ? bonus * 2 : bonus);
  
  combo++;
  maxCombo = Math.max(maxCombo, combo);
  
  FX.playRoundClear();
  FX.spawnCelebration(w, h);
  showFeedback(bonus > 0 ? 'Flawless! <svg style="display:inline-block; vertical-align:middle; margin-left: 4px;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : "Round Clear!", "perfect");
  
  activeEffects.doublePoints = false;
  activeEffects.slowMotion = false;
  
  spawnPowerUpDrop();
  updateHUD();
  
  setTimeout(() => {
    if (state === "between") startNextRound();
  }, 1500);
}

function handleWrongTap(pulsar) {
  misses++;
  combo = 0;
  currentTarget = -1;
  if (lives !== Infinity) lives--;
  
  if (pulsar) pulsar.wilt = 1;
  
  showFeedback("Drifted", "miss");
  FX.playMiss();
  FX.shake(6);
  FX.spawnRipple(pulsar ? pulsar.x : mouseX, pulsar ? pulsar.y : mouseY, "var(--coral)", 200);
  
  updateHUD();
  updateShields();
  
  if (lives <= 0) {
    endGame(false);
    return;
  }
  
  setPhase("Watch again", "Showing the sequence once more...");
  state = "watching";
  els.progressFill.style.width = "0%";
  setTimeout(() => startWatchPhase(), 800);
}

function handleTimeout() {
  misses++;
  combo = 0;
  currentTarget = -1;
  if (lives !== Infinity) lives--;
  
  showFeedback("Breathe", "miss");
  FX.playMiss();
  FX.shake(4);
  
  updateHUD();
  updateShields();
  
  if (lives <= 0) {
    endGame(false);
    return;
  }
  
  setPhase("Watch again", "Showing the sequence once more...");
  state = "watching";
  els.progressFill.style.width = "0%";
  setTimeout(() => startWatchPhase(), 800);
}

function activatePowerUp(p) {
  FX.playPowerUp();
  showPowerUpNotif(`${p.icon} <span style="display:inline-block; vertical-align:middle; margin-left: 4px;">${p.name}!</span>`);
  
  if (p.id === 'freeze') {
    if (mode.replayTimeout !== Infinity) replayDeadline += 5000;
  } else if (p.id === 'shield') {
    if (lives !== Infinity && lives < mode.lives) {
      lives++;
      updateShields();
    }
  } else if (p.id === 'double') {
    activeEffects.doublePoints = true;
  } else if (p.id === 'slow') {
    activeEffects.slowMotion = true;
  }
  
  FX.spawn(p.x, p.y, "#f5d76e", 30, { speed: 200, life: 1, glow: true });
  activePowerUpDrop = null;
}

function endGame(won) {
  state = "ended";
  FX.stopAmbient();
  els.hud.classList.add("hidden");
  els.comboMeter.classList.add("hidden");
  els.progressBar.classList.add("hidden");
  els.soundToggle.classList.remove("in-game");
  
  const currentBest = bestScores[modeId] || 0;
  const leaderboardEntry = saveLeaderboardEntry(won);
  if (score > currentBest) {
    bestScores[modeId] = score;
    localStorage.setItem("lumina-best", JSON.stringify(bestScores));
  }
  const bestAfterRun = bestScores[modeId] || currentBest;
  updateBestDisplay();
  renderLeaderboards(leaderboardEntry.id);
  
  els.resultIcon.innerHTML = won ? '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  els.resultTitle.textContent = won ? "Constellation Formed" : "Signal Faded";
  els.resultText.textContent = `You reached round ${round} with ${formatScore(score)} points${score > currentBest ? " — new best!" : `. Best: ${formatScore(bestAfterRun)}`}`;
  els.rPerfect.textContent = perfects;
  els.rGood.textContent = goods;
  els.rMiss.textContent = misses;
  els.rCombo.textContent = `x${maxCombo}`;
  
  setTimeout(() => els.result.classList.remove("hidden"), 800);
}

// ── UI Helpers ──
function updateHUD() {
  // Animate score counter (simple version)
  const currentScore = parseInt(els.score.textContent) || 0;
  if (currentScore !== score) {
    els.score.textContent = score;
    els.score.classList.add('bump');
    setTimeout(() => els.score.classList.remove('bump'), 150);
  }
  
  els.combo.textContent = `x${combo}`;
  els.round.textContent = round;
  
  // Combo meter logic
  const comboPerc = Math.min(100, (combo / 10) * 100);
  els.comboFill.style.width = `${comboPerc}%`;
  if (combo > 0 && combo % 5 === 0) {
    els.comboFill.classList.add('pulse');
    setTimeout(() => els.comboFill.classList.remove('pulse'), 400);
  }
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
  els.feedback.innerHTML = text;
  els.feedback.className = `feedback ${type} show`;
  feedbackTimer = setTimeout(() => {
    els.feedback.classList.remove("show");
    els.feedback.classList.add("hidden");
  }, 600);
}

function showPowerUpNotif(text) {
  els.powerUpNotif.innerHTML = text;
  els.powerUpNotif.classList.remove("hidden");
  setTimeout(() => els.powerUpNotif.classList.add("hidden"), 2000);
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
    createdAt: Date.now()
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

function formatRunDate(timestamp) {
  if (!timestamp) return "Just now";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function renderLeaderboardList(listEl, entries, activeId = null) {
  if (!listEl) return;

  if (!entries || entries.length === 0) {
    listEl.innerHTML = '<li class="leaderboard-empty">No scores yet</li>';
    return;
  }

  listEl.innerHTML = entries.map((entry, index) => `
    <li class="${entry.id === activeId ? "is-current" : ""}">
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-main">
        <strong>${formatScore(entry.score)}</strong>
        <em>Round ${entry.round} · x${entry.combo}</em>
      </span>
      <span class="leaderboard-date">${formatRunDate(entry.createdAt)}</span>
    </li>
  `).join("");
}

function renderLeaderboards(activeId = null) {
  renderLeaderboardList(els.homeLeaderboardSpeed, leaderboards.speed, activeId);
  renderLeaderboardList(els.homeLeaderboardEndless, leaderboards.endless, activeId);
  renderLeaderboardList(els.resultLeaderboard, leaderboards[modeId], activeId);
  els.resultLeaderboardTitle.textContent = `${MODES[modeId].name} Leaderboard`;
}

function updateBestDisplay() {
  const currentBest = bestScores[modeId] || 0;
  els.bestDisplay.textContent = `Best ${MODES[modeId].name} Score: ${formatScore(currentBest)}`;
  renderLeaderboards();
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
});

function onTap(e) {
  if (e.target.closest('button')) return; // ignore UI taps
  e.preventDefault();
  FX.ensureAudio();
  
  const pt = getPoint(e);
  
  // Check powerup tap
  if (activePowerUpDrop && (state === "replaying" || state === "between")) {
    if (Math.hypot(pt.x - activePowerUpDrop.x, pt.y - activePowerUpDrop.y) < 40) {
      activatePowerUp(activePowerUpDrop);
      return;
    }
  }

  // Visual tap feedback everywhere
  if (state === "replaying" || state === "watching" || state === "between") {
    FX.spawnRipple(pt.x, pt.y, "rgba(255,255,255,0.3)", 60);
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
els.modeCards.forEach(card => {
  card.addEventListener("click", () => {
    const sMode = card.getAttribute("data-mode");
    FX.ensureAudio();
    startGame(sMode);
  });
});

els.retryBtn.addEventListener("click", () => { FX.ensureAudio(); startGame(modeId); });
els.homeBtn.addEventListener("click", () => {
  state = "home";
  currentTarget = -1;
  activePowerUpDrop = null;
  FX.stopAmbient();
  els.result.classList.add("hidden");
  els.home.classList.remove("hidden");
  updateBestDisplay();
});

els.soundToggle.addEventListener("click", () => {
  FX.soundEnabled = !FX.soundEnabled;
  els.soundToggle.innerHTML = FX.soundEnabled 
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>' 
    : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>';
  if (FX.soundEnabled && state !== "home" && state !== "ended") FX.startAmbient();
  else FX.stopAmbient();
});

// ── Update ──
function update(dt, now) {
  FX.updateShake(dt);
  FX.updateRipples(dt);
  FX.updateParticles(dt);

  // Apply shake to context transform calculation later

  for (const p of pulsars) {
    p.bloom = Math.max(0, p.bloom - dt * 1.2);
    p.wilt = Math.max(0, p.wilt - dt * 1.8);
    if (p.glow > 0 && currentTarget !== p.id) p.glow = Math.max(0, p.glow - dt * 2);
    
    // Combo fire for last tapped
    if (combo >= 5 && state === "replaying" && replayIndex > 0 && p.id === sequence[replayIndex - 1]) {
      if (Math.random() < 0.2) {
        const a = Math.random() * Math.PI * 2;
        const r = p.radius + 10;
        FX.spawn(p.x + Math.cos(a)*r, p.y + Math.sin(a)*r, p.color, 1, { speed: 20, size: 1.5, life: 0.4 });
      }
    }
  }

  // Replay timeout check
  if (state === "replaying" && mode.replayTimeout !== Infinity && now > replayDeadline) {
    handleTimeout();
  }

  // Background particles
  for (const p of bgParticles) {
    p.y -= p.speed;
    p.x += p.drift + Math.sin(now * 0.001 + p.phase) * 0.15;
    if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
    if (p.x < -10) p.x = w + 10;
    if (p.x > w + 10) p.x = -10;
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

  // Nebula drift
  for (const n of nebulaSeeds) {
    n.x += n.drift;
    n.y += Math.sin(now * 0.0003 + n.phase) * 0.04;
    if (n.x < -n.rx) n.x = w + n.rx;
    if (n.x > w + n.rx) n.x = -n.rx;
  }

  for (const d of cosmicDust) {
    d.x += d.vx + Math.sin(now * 0.00025 + d.phase) * 0.035;
    d.y += d.vy;
    if (d.y < -d.r) { d.y = h + d.r; d.x = Math.random() * w; }
    if (d.x < -d.r) d.x = w + d.r;
    if (d.x > w + d.r) d.x = -d.r;
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
    countdownValue = 3 - Math.floor(elapsed / 800);
    if (countdownValue <= 0) {
      state = "between";
      beginPlaying();
    }
  }
}

// ── Render ──
function drawBackground(now) {
  // Shift background temperature based on round
  const tempShift = Math.min(round * 2, 20);
  const grad = ctx.createLinearGradient(0, 0, w * 0.3, h);
  grad.addColorStop(0, `hsl(${220 - tempShift}, 40%, 4%)`);
  grad.addColorStop(0.35, `hsl(${215 - tempShift}, 40%, 6%)`);
  grad.addColorStop(0.65, `hsl(${210 - tempShift}, 40%, 8%)`);
  grad.addColorStop(1, `hsl(${225 - tempShift}, 30%, 5%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawNebulae(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const n of nebulaSeeds) {
    const breathe = 1 + Math.sin(now * 0.0004 + n.phase) * 0.12;
    // React to combo
    const intensity = 1 + (combo / 20);
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.rx * breathe * intensity);
    const sat = 30 + Math.sin(now * 0.0002 + n.phase) * 10;
    g.addColorStop(0, `hsla(${n.hue}, ${sat}%, 45%, ${n.alpha * 1.2})`);
    g.addColorStop(0.4, `hsla(${n.hue}, ${sat}%, 30%, ${n.alpha * 0.7})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, n.rx * breathe * intensity, n.ry * breathe * intensity, n.phase * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGalaxyBand(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.42);

  for (const band of galaxyBands) {
    const drift = Math.sin(now * 0.00018 + band.phase) * 18;
    const y = band.offset + drift;
    const grad = ctx.createLinearGradient(-w, y, w, y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.22, `hsla(${band.hue}, 44%, 54%, ${band.alpha * 0.4})`);
    grad.addColorStop(0.5, `hsla(${band.hue}, 48%, 68%, ${band.alpha})`);
    grad.addColorStop(0.78, `hsla(${band.hue}, 44%, 54%, ${band.alpha * 0.4})`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.filter = "blur(10px)";
    ctx.fillRect(-w, y - band.width / 2, w * 2, band.width);
  }

  ctx.filter = "none";
  ctx.restore();
}

function drawCosmicDust(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const d of cosmicDust) {
    const breathe = 0.7 + Math.sin(now * 0.0007 + d.phase) * 0.3;
    const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
    g.addColorStop(0, `hsla(${d.hue}, 45%, 72%, ${d.alpha * breathe})`);
    g.addColorStop(0.45, `hsla(${d.hue}, 38%, 50%, ${d.alpha * 0.45 * breathe})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStars(now) {
  ctx.save();
  // Parallax offset
  const px = (mouseX - w/2) * 0.02;
  const py = (mouseY - h/2) * 0.02;
  ctx.translate(-px, -py);
  
  for (const s of stars) {
    const twinkle = 0.3 + Math.sin(now * 0.001 * s.speed + s.phase) * 0.35;
    const alpha = Math.max(0.05, twinkle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${s.hue}, 20%, 85%)`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    if (s.size > 1.4 && alpha > 0.5) {
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = `hsl(${s.hue}, 30%, 80%)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - s.size * 3, s.y); ctx.lineTo(s.x + s.size * 3, s.y);
      ctx.moveTo(s.x, s.y - s.size * 3); ctx.lineTo(s.x, s.y + s.size * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawShootingStars() {
  ctx.save();
  for (const s of shootingStars) {
    const t = s.life / s.maxLife;
    const tailX = s.x - s.vx * s.length * 0.15;
    const tailY = s.y - s.vy * s.length * 0.15;
    const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, `rgba(220, 230, 245, ${t * 0.7})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = t;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.fillStyle = `rgba(240, 248, 255, ${t * 0.9})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAurora(now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const points = 60;
  for (let layer = 0; layer < 2; layer++) {
    const yBase = h * (0.12 + layer * 0.06);
    const hue = layer === 0 ? 160 + round * 2 : 270 - round;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let i = 0; i <= points; i++) {
      const px = (i / points) * w;
      const wave1 = Math.sin(i * 0.15 + now * 0.0006 + layer) * 25;
      const wave2 = Math.sin(i * 0.08 + now * 0.0003) * 15;
      ctx.lineTo(px, yBase + wave1 + wave2);
    }
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const ag = ctx.createLinearGradient(0, 0, 0, yBase + 40);
    ag.addColorStop(0, "transparent");
    ag.addColorStop(0.7, `hsla(${hue}, 40%, 40%, 0.03)`);
    ag.addColorStop(1, `hsla(${hue}, 35%, 35%, 0.06)`);
    ctx.fillStyle = ag;
    ctx.fill();
  }
  ctx.restore();
}

function drawConstellations(now) {
  const active = state === "watching" || state === "replaying" || state === "between" || state === "ended";
  if (!active) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  
  // Base faint lines
  const maxDist = Math.min(w, h) * 0.4;
  for (let i = 0; i < pulsars.length; i++) {
    for (let j = i + 1; j < pulsars.length; j++) {
      const a = pulsars[i], b = pulsars[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > maxDist) continue;
      const alpha = (1 - dist / maxDist) * 0.06;
      ctx.strokeStyle = `rgba(180, 200, 220, ${alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Watch phase trail
  if (state === "watching" && watchIndex > 0) {
    ctx.beginPath();
    ctx.moveTo(pulsars[sequence[0]].x, pulsars[sequence[0]].y);
    for (let i = 1; i < watchIndex; i++) {
      ctx.lineTo(pulsars[sequence[i]].x, pulsars[sequence[i]].y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]);
    ctx.lineDashOffset = -now * 0.05;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Replay phase success trail
  if (state === "replaying" && replayIndex > 1) {
    ctx.beginPath();
    ctx.moveTo(pulsars[sequence[0]].x, pulsars[sequence[0]].y);
    for (let i = 1; i < replayIndex; i++) {
      ctx.lineTo(pulsars[sequence[i]].x, pulsars[sequence[i]].y);
    }
    ctx.strokeStyle = "rgba(126, 221, 181, 0.6)"; // Mint color
    ctx.lineWidth = 3;
    ctx.shadowColor = "#7eddb5";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawBgParticles(now) {
  ctx.save();
  for (const p of bgParticles) {
    const alpha = 0.15 + Math.sin(now * 0.0015 + p.phase) * 0.12;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${100 + Math.sin(p.phase) * 40}, 30%, 75%, 1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPulsar(p, now) {
  const isTarget = p.id === currentTarget && state === "replaying";
  const bloomScale = 1 + p.bloom * 0.4;
  const wiltScale = p.wilt > 0 ? Math.max(0, 1 - p.wilt * 0.5) : 1;
  const idleScale = 1 + Math.sin(now * 0.002 + p.phase) * 0.05;
  const targetPulse = isTarget ? 0.55 + Math.sin(now * 0.007) * 0.22 : 0;
  const energy = Math.max(p.bloom, p.glow, targetPulse);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(bloomScale * wiltScale * idleScale, bloomScale * wiltScale * idleScale);

  const coronaRadius = p.radius * (1.7 + energy * 0.7);
  const corona = ctx.createRadialGradient(0, 0, p.radius * 0.15, 0, 0, coronaRadius);
  corona.addColorStop(0, p.color);
  corona.addColorStop(0.25, `${p.color}66`);
  corona.addColorStop(0.62, `${p.color}18`);
  corona.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = p.wilt > 0 ? 0.12 : 0.42 + energy * 0.26;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(0, 0, coronaRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < 3; i++) {
    const ringScale = 1 + i * 0.16;
    ctx.save();
    ctx.rotate(now * (0.00035 + i * 0.00018) * (i % 2 ? -1 : 1) + p.haloSpin + i * 0.75);
    ctx.globalAlpha = p.wilt > 0 ? 0.08 : 0.22 + p.bloom * 0.24 + (isTarget ? 0.12 : 0);
    ctx.strokeStyle = i === 1 ? "rgba(255,255,255,0.58)" : p.color;
    ctx.lineWidth = Math.max(1, p.radius * (0.026 + i * 0.004));
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.08 * ringScale, p.radius * 0.34 * ringScale, 0, 0.18, Math.PI * 1.72);
    ctx.stroke();
    ctx.globalAlpha *= 0.65;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.08 * ringScale, p.radius * 0.34 * ringScale, 0, Math.PI + 0.1, Math.PI * 1.42);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(now * 0.00022 + p.haloSpin);
  ctx.globalAlpha = p.wilt > 0 ? 0.06 : 0.15 + p.bloom * 0.12 + (isTarget ? 0.1 : 0);
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 9]);
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius * 1.42, p.radius * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (p.bloom > 0) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5 + p.bloom * 2;
    ctx.globalAlpha = p.bloom * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 12 + (1 - p.bloom) * 48, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const a = now * (0.00038 + i * 0.000045) * (i % 2 ? -1 : 1) + p.phase + i * 0.78;
    const orbitX = p.radius * (0.86 + (i % 3) * 0.14);
    const orbitY = p.radius * (0.34 + (i % 2) * 0.1);
    const ox = Math.cos(a) * orbitX;
    const oy = Math.sin(a) * orbitY;
    const sparkle = 0.55 + Math.sin(now * 0.003 + i + p.phase) * 0.25;
    ctx.globalAlpha = p.wilt > 0 ? 0.12 : sparkle;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6 + energy * 8;
    ctx.fillStyle = i % 4 === 0 ? "#ffffff" : p.color;
    ctx.beginPath();
    ctx.arc(ox, oy, 1.1 + (i % 3) * 0.45 + energy * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  ctx.globalAlpha = p.wilt > 0 ? 0.4 : 1;
  const coreRadius = p.radius * (0.34 + energy * 0.1) + Math.sin(now * 0.004 + p.id) * 1.5;
  const centerGrad = ctx.createRadialGradient(-coreRadius * 0.3, -coreRadius * 0.35, 1, 0, 0, coreRadius * 1.35);
  centerGrad.addColorStop(0, "#ffffff");
  centerGrad.addColorStop(0.22, "#fff8dc");
  centerGrad.addColorStop(0.48, p.color);
  centerGrad.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.fillStyle = centerGrad;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 14 + energy * 18;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = p.wilt > 0 ? 0.12 : 0.45 + energy * 0.2;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius * 1.28, Math.PI * 1.08, Math.PI * 1.72);
  ctx.stroke();

  ctx.globalAlpha = p.wilt > 0 ? 0.2 : 0.7;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${Math.max(10, p.radius * 0.35)}px 'Outfit', system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.id + 1), 0, 1);

  ctx.restore();
}

function drawPowerUp(now) {
  if (!activePowerUpDrop) return;
  const p = activePowerUpDrop;
  const alpha = Math.min(1, p.life / 500); // fade out at end
  
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = alpha;
  
  // Outer glow aura
  const aura = 25 + Math.sin(now * 0.005) * 5;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, aura);
  g.addColorStop(0, "rgba(245, 215, 110, 0.4)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, aura, 0, Math.PI*2); ctx.fill();
  
  // Icon
  ctx.font = "24px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.icon, 0, 0);
  
  // Ring
  ctx.strokeStyle = "rgba(245, 215, 110, 0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = now * 0.02;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.stroke();
  
  ctx.restore();
}

function drawReplayIndicators(now) {
  if (state !== "replaying") return;
  ctx.save();

  for (let i = 0; i < replayIndex; i++) {
    const p = pulsars[sequence[i]];
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#7eddb5";
    ctx.font = `800 ${p.radius * 0.6}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", p.x, p.y - p.radius - 12);
  }

  for (const p of pulsars) {
    const pulse = Math.sin(now * 0.004 + p.id) * 0.08 + 0.12;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (mode.replayTimeout !== Infinity) {
    const elapsed = performance.now() - (replayDeadline - mode.replayTimeout);
    const progress = Math.min(1, Math.max(0, elapsed / mode.replayTimeout));
    if (progress > 0.6) {
      const warn = (progress - 0.6) / 0.4;
      ctx.globalAlpha = warn * 0.3;
      ctx.strokeStyle = "#ff7b7b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCountdown(now) {
  if (state !== "countdown") return;
  const elapsed = (now - countdownStart) % 800;
  const scale = 1 + (1 - elapsed / 800) * 0.5;
  const alpha = 1 - elapsed / 800;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#7eddb5";
  ctx.font = `800 ${80 * scale}px 'Outfit', system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.max(1, countdownValue), w / 2, h / 2);
  ctx.restore();
}

function render(now) {
  ctx.save();
  
  // Camera shake application
  if (FX.shakeX !== 0 || FX.shakeY !== 0) {
    ctx.translate(FX.shakeX, FX.shakeY);
  }

  // Camera zoom during watch phase
  if (state === "watching") {
    const zoom = 1.02;
    ctx.translate(w/2, h/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w/2, -h/2);
  }

  drawBackground(now);
  drawGalaxyBand(now);
  drawNebulae(now);
  drawCosmicDust(now);
  drawStars(now);
  drawAurora(now);
  drawShootingStars();
  drawBgParticles(now);

  const active = state === "watching" || state === "replaying" || state === "between" || state === "ended";
  if (active) {
    drawConstellations(now);
    FX.drawRipples(ctx);
    for (const p of pulsars) drawPulsar(p, now);
    drawPowerUp(now);
    drawReplayIndicators(now);
    FX.drawParticles(ctx);
  }

  drawCountdown(now);
  
  // Vignette overlay
  const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.4, w/2, h/2, Math.max(w,h)*0.8);
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  
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
