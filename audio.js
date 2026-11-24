/* Tavupeli — Offline Web Audio Engine
 * Soft rising pentatonic marimba for syllables + low muted bass tone for the Bear.
 */
window.TavupeliAudio = (() => {
  let ctx = null;
  let muted = false;

  const MARIMBA_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  function ensureContext() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function setMuted(flag) { muted = Boolean(flag); }
  function isMuted() { return muted; }

  function playSyllable(stepIndex = 0) {
    const ac = ensureContext();
    if (!ac) return;

    const freq = MARIMBA_NOTES[Math.max(0, Math.min(stepIndex, MARIMBA_NOTES.length - 1))];
    const now = ac.currentTime;

    const osc1 = ac.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ac.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 4, now);

    const g1 = ac.createGain();
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.linearRampToValueAtTime(0.22, now + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);

    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.linearRampToValueAtTime(0.035, now + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0005, now + 0.075);

    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(ac.destination);
    g2.connect(ac.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.1);
  }

  function playBearStep(stepIndex = 0) {
    const ac = ensureContext();
    if (!ac) return;

    const freqs = [110.0, 98.0, 87.31];
    const freq = freqs[stepIndex % freqs.length];
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.38);

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.44);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + 0.48);
  }

  function unlock() {
    ensureContext();
  }

  return { setMuted, isMuted, unlock, playSyllable, playBearStep };
})();
