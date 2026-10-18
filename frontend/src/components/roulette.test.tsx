import { act, render } from '@testing-library/react';
import { reelPosition } from '@/lib/roulette-motion';
import { Roulette } from './roulette';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterEach(() => vi.useRealTimers());

describe('Roulette', () => {
  it('hace un clic por cada nombre que pasa, cada vez más espaciados', async () => {
    const ticks: number[] = [];
    const onDone = vi.fn();
    const { container } = render(
      <Roulette
        names={['Ana', 'Luis', 'Pablo']}
        winner="Luis"
        durationMs={15000}
        onDone={onDone}
        onTick={() => ticks.push(performance.now())}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000);
    });
    expect(onDone).toHaveBeenCalledOnce();
    // Un clic por nombre que llega al centro, sin pasar de uno cada 45 ms
    // (al principio pasan varios por fotograma).
    const rows = container.querySelectorAll('li');
    const winnerRow = rows.length - 1 - 3;
    expect(ticks.length).toBeGreaterThan(20);
    expect(ticks.length).toBeLessThanOrEqual(winnerRow - 3);
    const gaps = ticks.slice(1).map((tick, i) => tick - ticks[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(45);
    // Frenada progresiva: los últimos clics están mucho más separados que
    // los primeros.
    expect(gaps.at(-1)!).toBeGreaterThan(gaps[0] * 10);
  });

  it('«Saltar animación» termina al momento', () => {
    const onDone = vi.fn();
    const { getByRole } = render(
      <Roulette
        names={['Ana']}
        winner="Ana"
        onDone={onDone}
        onTick={() => {}}
      />,
    );
    act(() => getByRole('button').click());
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('reelPosition', () => {
  it('empieza en 0, termina exactamente en el elegido y frena', () => {
    const d = 6000;
    expect(reelPosition(0, d, 15000)).toBe(0);
    expect(reelPosition(1, d, 15000)).toBeCloseTo(d, 6);
    const speed = (p: number) =>
      (reelPosition(p + 0.001, d, 15000) - reelPosition(p, d, 15000)) / 0.015;
    expect(speed(0.1)).toBeGreaterThan(speed(0.5));
    expect(speed(0.5)).toBeGreaterThan(speed(0.99));
    // Al final sigue moviéndose a ~60 px/s: el último nombre llega en menos
    // de un segundo en lugar de arrastrarse.
    expect(speed(0.998)).toBeGreaterThan(50);
  });
});
