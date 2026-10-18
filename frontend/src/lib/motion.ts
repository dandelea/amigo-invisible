// Si la persona ha pedido reducir el movimiento en su sistema. La ruleta se
// salta y se muestra el resultado directamente.
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
