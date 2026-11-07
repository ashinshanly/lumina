/* ═══════════════════════════════════════════
   Lumina FX — High-FPS Audio, Particles, Shake, Ripples
   ═══════════════════════════════════════════ */

const FX = (() => {
  let audioCtx = null;
  let reverbNode = null;
  let ambientGain = null;
  let ambientOscs = [];
  let ambientStarted = false;
  let soundEnabled = true;

  const MASTER_VOLUME = 1.65;
  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

  // ── Ripples (capped for 60fps) ──
  const ripples = [];
  const MAX_RIPPLES = 16;

  // ── Screen Shake ──
  let shakeX = 0, shakeY = 0, shakeInt = 0;

  function ensureAudio() {
    if (!audioCtx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audioCtx = new AudioCtor();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function buildReverb() {
    if (!audioCtx || reverbNode) return;
    const conv = audioCtx.createConvolver();
    const rate = audioCtx.sampleRate;
    const len = rate * 1.2;
    const buf = audioCtx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    conv.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.value = 0.12;
    conv.connect(g);
    g.connect(audioCtx.destination);
    reverbNode = conv;
  }

  function tone(freq, dur, type = 'sine', vol = 0.06) {
    if (!audioCtx || !soundEnabled) return;
    buildReverb();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const peak = Math.min(vol * MASTER_VOLUME, 0.22);
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    if (reverbNode) g.connect(reverbNode);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function startAmbient() {
    if (ambientStarted || !audioCtx || !soundEnabled) return;
    ambientStarted = true;
    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0;
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 350;
    filt.Q.value = 1;
    filt.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    [55, 82.41, 110].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq + (Math.random() - 0.5) * 0.5;
      const g = audioCtx.createGain();
      g.gain.value = 0.012 - i * 0.002;
      osc.connect(g);
      g.connect(filt);
      osc.start();
      ambientOscs.push(osc);
    });
    ambientGain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 3);
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = audioCtx.createGain();
    lg.gain.value = 80;
    lfo.connect(lg);
    lg.connect(filt.frequency);
    lfo.start();
    ambientOscs.push(lfo);
  }

  function stopAmbient() {
    if (!ambientStarted || !ambientGain) return;
    ambientGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
    const oscs = ambientOscs.slice();
    setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch(e) {} }); }, 1500);
    ambientOscs = [];
    ambientStarted = false;
  }

  // ── Exposed SFX ──
  function playPulsarTone(idx, dur = 0.3, vol = 0.1) {
    tone(PENTATONIC[idx % 7], dur, 'sine', vol);
  }
  function playBeat() { tone(220, 0.08, 'triangle', 0.04); }

  function playPerfect(idx) {
    const b = PENTATONIC[idx % 7];
    playPulsarTone(idx, 0.26, 0.11);
    tone(b * 2, 0.12, 'sine', 0.035);
    setTimeout(() => tone(b * 1.5, 0.14, 'sine', 0.03), 55);
  }

  function playGood(idx) { playPulsarTone(idx, 0.22, 0.095); }

  function playMiss() {
    tone(110, 0.25, 'sawtooth', 0.03);
    tone(95, 0.3, 'triangle', 0.025);
  }

  function playComboChime(c) {
    if (c < 5) return;
    for (let i = 0; i < Math.min(c - 3, 5); i++)
      setTimeout(() => tone(PENTATONIC[i % 7] * 2, 0.1, 'sine', 0.025), i * 55);
  }

  function playRoundClear() {
    PENTATONIC.forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.035), i * 70));
  }

  function playPowerUp() {
    tone(523.25, 0.12, 'sine', 0.05);
    setTimeout(() => tone(659.25, 0.1, 'sine', 0.04), 70);
    setTimeout(() => tone(783.99, 0.1, 'sine', 0.04), 140);
    setTimeout(() => tone(1046.5, 0.15, 'sine', 0.05), 210);
  }

  // ── Screen Shake ──
  function shake(intensity) { shakeInt = Math.max(shakeInt, intensity); }

  function updateShake() {
    if (shakeInt > 0.1) {
      shakeX = (Math.random() - 0.5) * shakeInt * 2;
      shakeY = (Math.random() - 0.5) * shakeInt * 2;
      shakeInt *= 0.88;
    } else {
      shakeX = shakeY = shakeInt = 0;
    }
  }

  // ── Multi-Ring Harmonic Ripples ──
  function spawnRipple(x, y, color, maxR, rings = 2) {
    for (let k = 0; k < rings; k++) {
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({
        x,
        y,
        color,
        r: k * 6,
        maxR: (maxR || 120) * (1 - k * 0.22),
        alpha: 0.6 - k * 0.18,
        speed: 230 - k * 40,
        width: 2 - k * 0.6,
      });
    }
  }

  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += dt * (r.speed || 220);
      const prog = r.r / r.maxR;
      r.alpha = Math.max(0, (1 - prog * prog) * 0.55);
      if (r.r >= r.maxR) ripples.splice(i, 1);
    }
  }

  function drawRipples(ctx) {
    if (!ripples.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of ripples) {
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width || 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Zero-ShadowBlur Fast Particles ──
  const particles = [];
  const MAX_PARTICLES = 90;

  function spawn(x, y, color, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
      const speed = (opts.speed || 90) + Math.random() * (opts.speedVar || 100);
      const life = (opts.life || 0.48) + Math.random() * (opts.lifeVar || 0.35);
      particles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (opts.size || 2) + Math.random() * (opts.sizeVar || 2.8),
        life,
        maxLife: life,
      });
    }
  }

  function spawnCelebration(w, h) {
    const cx = w / 2, cy = h / 2;
    const cols = ['#ff7b7b', '#b8a9e8', '#f5d76e', '#7eddb5', '#ffb5c5', '#87ceeb', '#ffab76'];
    for (let i = 0; i < 36; i++) {
      spawn(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 60,
        cols[i % 7], 1, { speed: 130, speedVar: 190, size: 2.2, sizeVar: 3.2, life: 0.7, lifeVar: 0.45 });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.prevX = p.x;
      p.prevY = p.y;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 26 * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(ctx) {
    if (!particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const t = Math.max(0, p.life / p.maxLife);
      const r = p.size * t;
      ctx.globalAlpha = t;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, r * 0.8);
      ctx.beginPath();
      ctx.moveTo(p.prevX, p.prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    ensureAudio, startAmbient, stopAmbient,
    playPulsarTone, playBeat, playPerfect, playGood, playMiss,
    playComboChime, playRoundClear, playPowerUp,
    get soundEnabled() { return soundEnabled; },
    set soundEnabled(v) { soundEnabled = v; },
    shake, updateShake, get shakeX() { return shakeX; }, get shakeY() { return shakeY; },
    spawnRipple, updateRipples, drawRipples,
    spawn, spawnCelebration, updateParticles, drawParticles,
    get ripples() { return ripples; },
    get particles() { return particles; },
  };
})();
