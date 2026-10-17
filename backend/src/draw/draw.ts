import { randomInt as cryptoRandomInt } from 'node:crypto';

// Algoritmo del sorteo: un único ciclo aleatorio A→B→C→…→A en el que todos
// regalan y reciben exactamente una vez. Es una función pura, sin base de
// datos ni sockets.
//
// Viabilidad: con la regla de pareja, los dos miembros de una pareja no
// pueden ser vecinos en el ciclo. Como cada persona tiene como mucho una
// pareja, cada una puede ir junto a n−2 personas como mínimo. Para n ≥ 4 eso
// es al menos n/2, y el teorema de Dirac garantiza un ciclo válido. Con
// n = 3 y una pareja no existe ninguno. Por eso la viabilidad se decide sin
// buscar.

export const MIN_PARTICIPANTS = 3;
export const MAX_PARTICIPANTS = 30;

// Con n ≥ 4 la probabilidad de acierto de cada intento es al menos 1/3
// (el peor caso es n = 4 con 2 parejas), así que agotar los intentos es
// prácticamente imposible. El límite solo evita un bucle infinito.
const MAX_ATTEMPTS = 10_000;

export type Pair = readonly [string, string];

export interface DrawInput {
  participantIds: readonly string[];
  pairs: readonly Pair[];
  pairRuleEnabled: boolean;
}

export type DrawErrorCode =
  | 'TOO_FEW_PARTICIPANTS'
  | 'TOO_MANY_PARTICIPANTS'
  | 'INVALID_INPUT'
  | 'NO_SOLUTION';

export type Feasibility = { ok: true } | { ok: false; code: DrawErrorCode };

export class DrawError extends Error {
  constructor(readonly code: DrawErrorCode) {
    super(code);
    this.name = 'DrawError';
  }
}

// Devuelve un entero aleatorio en [min, max). Se inyecta solo en los tests.
export type RandomInt = (min: number, max: number) => number;

// Comprueba, sin sortear, si el sorteo es posible. El panel del organizador
// la usa para avisar antes de ejecutar.
export function checkDrawFeasibility(input: DrawInput): Feasibility {
  const { participantIds, pairs, pairRuleEnabled } = input;
  const n = participantIds.length;

  if (!isValidInput(participantIds, pairs)) {
    return { ok: false, code: 'INVALID_INPUT' };
  }
  if (n < MIN_PARTICIPANTS) return { ok: false, code: 'TOO_FEW_PARTICIPANTS' };
  if (n > MAX_PARTICIPANTS) {
    return { ok: false, code: 'TOO_MANY_PARTICIPANTS' };
  }
  if (pairRuleEnabled && n === 3 && pairs.length > 0) {
    return { ok: false, code: 'NO_SOLUTION' };
  }
  return { ok: true };
}

// Sortea y devuelve el ciclo: cycle[i] regala a cycle[i + 1] y el último
// regala al primero. Baraja con crypto y reintenta hasta cumplir la regla de
// pareja. Barajar todas las posiciones de forma uniforme y descartar los
// ciclos inválidos da un ciclo uniforme entre los válidos.
export function drawCycle(
  input: DrawInput,
  randomInt: RandomInt = cryptoRandomInt,
): string[] {
  const feasibility = checkDrawFeasibility(input);
  if (!feasibility.ok) throw new DrawError(feasibility.code);

  const partnerOf = new Map<string, string>();
  if (input.pairRuleEnabled) {
    for (const [a, b] of input.pairs) {
      partnerOf.set(a, b);
      partnerOf.set(b, a);
    }
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const cycle = shuffle(input.participantIds, randomInt);
    if (respectsPairs(cycle, partnerOf)) return cycle;
  }
  throw new DrawError('NO_SOLUTION');
}

// Convierte el ciclo en un mapa regalador → receptor.
export function cycleToAssignments(
  cycle: readonly string[],
): Map<string, string> {
  const assignments = new Map<string, string>();
  cycle.forEach((giver, i) => {
    assignments.set(giver, cycle[(i + 1) % cycle.length]);
  });
  return assignments;
}

function shuffle(items: readonly string[], randomInt: RandomInt): string[] {
  const result = [...items];
  // Fisher–Yates.
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function respectsPairs(
  cycle: readonly string[],
  partnerOf: ReadonlyMap<string, string>,
): boolean {
  if (partnerOf.size === 0) return true;
  return cycle.every(
    (giver, i) => partnerOf.get(giver) !== cycle[(i + 1) % cycle.length],
  );
}

// Participantes sin repetir; parejas de dos personas distintas de la sala,
// y cada persona en una pareja como mucho.
function isValidInput(
  participantIds: readonly string[],
  pairs: readonly Pair[],
): boolean {
  const ids = new Set(participantIds);
  if (ids.size !== participantIds.length) return false;
  const paired = new Set<string>();
  for (const [a, b] of pairs) {
    if (a === b || !ids.has(a) || !ids.has(b)) return false;
    if (paired.has(a) || paired.has(b)) return false;
    paired.add(a);
    paired.add(b);
  }
  return true;
}
