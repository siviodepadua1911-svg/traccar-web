// Sons de alerta gerados no proprio navegador (Web Audio) - sem arquivos externos.
let ctx;
const getCtx = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = AC ? new AC() : null;
  }
  return ctx;
};

const playSeq = (steps) => {
  try {
    const ac = getCtx();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime;
    steps.forEach((s) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = s.type || 'sine';
      osc.frequency.setValueAtTime(s.f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(s.v || 0.3, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + s.d);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + s.d + 0.03);
      t += s.d + (s.gap != null ? s.gap : 0.07);
    });
  } catch {
    // audio bloqueado pelo navegador
  }
};

export const LS_SOUND_PRESETS = {
  none: { label: 'Sem som', steps: [] },
  sireneForte: {
    label: 'Sirene forte',
    steps: [
      { f: 660, d: 0.26, type: 'sawtooth', v: 0.5 },
      { f: 1100, d: 0.26, type: 'sawtooth', v: 0.5 },
      { f: 660, d: 0.26, type: 'sawtooth', v: 0.5 },
      { f: 1100, d: 0.26, type: 'sawtooth', v: 0.5 },
    ],
  },
  urgente: {
    label: 'Alarme urgente',
    steps: [
      { f: 1000, d: 0.1, type: 'square', v: 0.5, gap: 0.05 },
      { f: 1000, d: 0.1, type: 'square', v: 0.5, gap: 0.05 },
      { f: 1000, d: 0.1, type: 'square', v: 0.5, gap: 0.05 },
      { f: 1000, d: 0.1, type: 'square', v: 0.5, gap: 0.05 },
      { f: 1000, d: 0.1, type: 'square', v: 0.5 },
    ],
  },
  emergencia: {
    label: 'Emergência',
    steps: [
      { f: 800, d: 0.15, type: 'square', v: 0.5 },
      { f: 1250, d: 0.15, type: 'square', v: 0.5 },
      { f: 800, d: 0.15, type: 'square', v: 0.5 },
      { f: 1250, d: 0.15, type: 'square', v: 0.5 },
      { f: 800, d: 0.15, type: 'square', v: 0.5 },
      { f: 1250, d: 0.15, type: 'square', v: 0.5 },
    ],
  },
  buzina: { label: 'Buzina', steps: [{ f: 240, d: 0.5, type: 'sawtooth', v: 0.5 }] },
  beep: { label: 'Bipe simples', steps: [{ f: 880, d: 0.18 }] },
  double: {
    label: 'Bipe duplo',
    steps: [
      { f: 880, d: 0.11 },
      { f: 880, d: 0.11 },
    ],
  },
  rising: {
    label: 'Subindo',
    steps: [
      { f: 600, d: 0.11 },
      { f: 800, d: 0.11 },
      { f: 1050, d: 0.14 },
    ],
  },
  siren: {
    label: 'Sirene',
    steps: [
      { f: 700, d: 0.22, type: 'sawtooth' },
      { f: 1050, d: 0.22, type: 'sawtooth' },
      { f: 700, d: 0.22, type: 'sawtooth' },
    ],
  },
  low: {
    label: 'Alarme grave',
    steps: [
      { f: 210, d: 0.28, type: 'square', v: 0.22 },
      { f: 170, d: 0.28, type: 'square', v: 0.22 },
    ],
  },
  ping: {
    label: 'Ping agudo',
    steps: [
      { f: 1400, d: 0.09 },
      { f: 1850, d: 0.12 },
    ],
  },
};

export const playPreset = (name) => {
  const p = LS_SOUND_PRESETS[name];
  if (p && p.steps.length) {
    playSeq(p.steps);
  }
};
