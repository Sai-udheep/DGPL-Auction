// Web Audio API Synthesizer for Captain Alarm Beeps & Vibration
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Play synthesized beep according to call level (1st, 2nd, 3rd Call)
export const playAuctionCallSound = (callNumber) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (callNumber === 1) {
      // 1st Call: Single sharp reminder beep (800Hz, 160ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      // Vibration: single pulse
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([160]);
      }
    } else if (callNumber === 2) {
      // 2nd Call: Double alert beep (950Hz, 2 pulses)
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(950, now + offset);
        gain.gain.setValueAtTime(0.35, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });

      // Vibration: double buzz
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([180, 80, 180]);
      }
    } else if (callNumber === 3) {
      // 3rd / Final Call: Urgent triple high-frequency alarm (1150Hz)
      [0, 0.14, 0.28].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(1150, now + offset);
        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });

      // Vibration: urgent triple pattern
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([250, 80, 250, 80, 350]);
      }
    }
  } catch (err) {
    console.warn("[AuctionSound] Audio playback prevented:", err);
  }
};

// Play Sold celebration chime & vibration
export const playSoldSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const offset = idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.3, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.35);
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([300, 100, 400]);
    }
  } catch (_) {}
};
