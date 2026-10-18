// Sonido de «clic» de la ruleta, sintetizado con Web Audio (sin archivos).
// El navegador permite el sonido porque antes ha habido un toque de la
// persona («Descubrir mi amigo invisible»). Si no hay Web Audio, no suena.

export interface Clicker {
  click: () => void;
  close: () => void;
}

const silent: Clicker = { click: () => {}, close: () => {} };

export function createClicker(): Clicker {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return silent;
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return silent;
  }
  void ctx.resume().catch(() => undefined);
  return {
    click() {
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // Un pulso corto y agudo que se apaga enseguida.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    },
    close() {
      void ctx.close().catch(() => undefined);
    },
  };
}
