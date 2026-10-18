import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Borra las salas creadas por los tests (su nombre empieza por «E2E ·»)
// con el script de administración, para no llenar MAX_ROOMS en desarrollo.
export default function globalTeardown() {
  // Playwright se ejecuta desde la raíz del repositorio.
  const backend = resolve('backend');
  const script = resolve(backend, 'dist/scripts/rooms.js');
  const run = (...args: string[]) =>
    execFileSync('node', [script, ...args], { cwd: backend, encoding: 'utf8' });
  const ids = run('list')
    .split('\n')
    .filter((line) => line.includes('E2E ·'))
    .map((line) => line.split(/\s+/)[0]);
  for (const id of ids) run('delete', id, '--yes');
  console.log(`e2e: ${ids.length} sala(s) de prueba borradas`);
}
