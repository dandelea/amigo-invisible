// Movimiento de la cinta de la ruleta.

// Velocidad con la que llega el último nombre: recorre su fila (54 px) en
// ~0,9 s y se para en la flecha, sin quedarse segundos arrastrándose.
const END_SPEED = 54 / 0.9; // px por segundo

// Posición de la cinta: frenada progresiva (la velocidad cae como (1-t)^4,
// así que los clics se van espaciando) más una velocidad mínima que la deja
// exactamente en `distance` al terminar.
export function reelPosition(
  progress: number,
  distance: number,
  durationMs: number,
): number {
  const seconds = durationMs / 1000;
  const decaying = distance - END_SPEED * seconds;
  if (decaying <= 0) return distance * (1 - Math.pow(1 - progress, 5));
  return (
    END_SPEED * seconds * progress + decaying * (1 - Math.pow(1 - progress, 5))
  );
}
