import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { t } from '@/texts/es';

const ROW = 54; // alto de cada nombre, en px
const VISIBLE = 7; // nombres a la vista (el del centro es el elegido)
const PAUSE_MS = 600; // pausa sobre el resultado antes de mostrarlo

// Ruleta decorativa: el resultado ya lo ha decidido el servidor. Una cinta
// de nombres que gira unos 15 s y se frena hasta dejar a `winner` en el
// centro. Se puede saltar en cualquier momento. Quien use «reducir
// movimiento» no la ve (la página muestra el resultado directo).
export function Roulette({
  names,
  winner,
  durationMs = 15000,
  onDone,
}: {
  names: string[];
  winner: string;
  durationMs?: number;
  onDone: () => void;
}) {
  // Cinta: los nombres repetidos varias vueltas, el elegido y unos cuantos
  // detrás para que el centro nunca quede vacío.
  const reel = useMemo(() => {
    const pool = names.length > 0 ? names : [winner];
    // Bastantes vueltas para que la cinta vaya rápida al principio.
    const laps = Math.max(6, Math.ceil(120 / pool.length));
    const items: string[] = [];
    for (let i = 0; i < laps; i++) items.push(...pool);
    // Que el mismo nombre no aparezca pegado al elegido, ni antes ni después.
    const others = pool.filter((n) => n !== winner);
    const fill = others.length > 0 ? others : pool;
    if (items.at(-1) === winner && others.length > 0) items.pop();
    items.push(winner);
    for (let i = 0; i < Math.floor(VISIBLE / 2); i++) {
      items.push(fill[i % fill.length]);
    }
    return items;
  }, [names, winner]);
  const target = (reel.length - 1 - Math.floor(VISIBLE / 2)) * ROW;
  const winnerOffset = target - Math.floor(VISIBLE / 2) * ROW;

  const [offset, setOffset] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let frame = 0;
    let finish: number | undefined;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // Frenada suave (ease-out cúbica).
      const eased = 1 - Math.pow(1 - progress, 3);
      setOffset(eased * winnerOffset);
      setElapsed(progress);
      if (progress < 1) frame = requestAnimationFrame(step);
      else finish = window.setTimeout(() => done.current(), PAUSE_MS);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finish);
    };
  }, [durationMs, winnerOffset]);

  return (
    <div className="flex flex-col gap-3.5">
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-xl border bg-card"
        style={{ height: ROW * VISIBLE }}
      >
        {/* Franja del centro */}
        <div
          className="absolute inset-x-0 z-[1] border-y-2 border-primary bg-accent"
          style={{ top: ROW * Math.floor(VISIBLE / 2), height: ROW }}
        />
        <ul
          className="relative z-[2] will-change-transform"
          style={{ transform: `translateY(${-offset}px)` }}
        >
          {reel.map((name, i) => (
            <li
              key={i}
              className="flex items-center justify-center text-2xl font-semibold"
              style={{ height: ROW }}
            >
              {name}
            </li>
          ))}
        </ul>
        {/* Difuminado arriba y abajo */}
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,var(--card)_0%,transparent_30%,transparent_70%,var(--card)_100%)]" />
        <svg
          width="16"
          height="18"
          viewBox="0 0 16 18"
          className="absolute left-2 z-[4] fill-primary"
          style={{ top: ROW * Math.floor(VISIBLE / 2) + ROW / 2 - 9 }}
        >
          <path d="M2 1l12 8-12 8z" />
        </svg>
        <svg
          width="16"
          height="18"
          viewBox="0 0 16 18"
          className="absolute right-2 z-[4] fill-primary"
          style={{ top: ROW * Math.floor(VISIBLE / 2) + ROW / 2 - 9 }}
        >
          <path d="M14 1L2 9l12 8z" />
        </svg>
      </div>
      <p
        aria-live="polite"
        className="text-center text-[13px] text-muted-foreground"
      >
        {t.draw.soon}
      </p>
      <ProgressBar
        value={Math.round(elapsed * 100)}
        max={100}
        label={t.draw.spinning}
        className="h-1.5"
      />
      <Button onClick={() => done.current()}>{t.draw.skip}</Button>
    </div>
  );
}
