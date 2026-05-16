/* ═══════════════════════════════════════════
   Lumina FX — Audio, Particles, Shake, Ripples
   ═══════════════════════════════════════════ */

const FX = (() => {
  let audioCtx = null;
  let reverbNode = null;
  let ambientGain = null;
  let ambientOscs = [];
  let ambientStarted = false;
  let soundEnabled = true;

  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

  // ── Ripples ──
  const ripples = [];

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
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.02);
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
    ambientGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 3);
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
  function playPulsarTone(idx) { tone(PENTATONIC[idx % 7], 0.25, 'sine', 0.07); }
  function playBeat() { tone(220, 0.08, 'triangle', 0.03); }

  function playPerfect(idx) {
    const b = PENTATONIC[idx % 7];
    tone(b, 0.22, 'sine', 0.07);
    tone(b * 1.25, 0.18, 'sine', 0.05);
    setTimeout(() => tone(b * 1.5, 0.15, 'sine', 0.04), 60);
  }

  function playGood(idx) { tone(PENTATONIC[idx % 7], 0.18, 'sine', 0.06); }

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

  function updateShake(dt) {
    if (shakeInt > 0.1) {
      shakeX = (Math.random() - 0.5) * shakeInt * 2;
      shakeY = (Math.random() - 0.5) * shakeInt * 2;
      shakeInt *= 0.88;
    } else {
      shakeX = shakeY = shakeInt = 0;
    }
  }

  // ── Ripples ──
  function spawnRipple(x, y, color, maxR) {
    ripples.push({ x, y, color, r: 0, maxR: maxR || 120, alpha: 0.6 });
  }

  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += dt * 220;
      r.alpha = 0.6 * (1 - r.r / r.maxR);
      if (r.r >= r.maxR) ripples.splice(i, 1);
    }
  }

  function drawRipples(ctx) {
    ctx.save();
    for (const r of ripples) {
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Particles ──
  const particles = [];

  function spawn(x, y, color, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = (opts.speed || 80) + Math.random() * (opts.speedVar || 100);
      particles.push({
        x, y, color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (opts.size || 2) + Math.random() * (opts.sizeVar || 3.5),
        life: (opts.life || 0.5) + Math.random() * (opts.lifeVar || 0.4),
        maxLife: (opts.life || 0.5) + Math.random() * (opts.lifeVar || 0.4),
        glow: opts.glow || false,
      });
    }
  }

  function spawnCelebration(w, h) {
    const cx = w / 2, cy = h / 2;
    const cols = ['#ff7b7b', '#b8a9e8', '#f5d76e', '#7eddb5', '#ffb5c5', '#87ceeb', '#ffab76'];
    for (let i = 0; i < 60; i++) {
      spawn(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 60,
        cols[i % 7], 1, { speed: 120, speedVar: 200, size: 2, sizeVar: 4, life: 0.8, lifeVar: 0.6, glow: true });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 35 * dt;
      p.vx *= 0.98;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(ctx) {
    ctx.save();
    for (const p of particles) {
      const t = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = t;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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
