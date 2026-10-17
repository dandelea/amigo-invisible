import {
  checkDrawFeasibility,
  cycleToAssignments,
  drawCycle,
  DrawError,
  type DrawInput,
  type Pair,
} from './draw.js';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

// Empareja a los 2k primeros: (p1,p2), (p3,p4)…
const firstPairs = (k: number): Pair[] =>
  Array.from({ length: k }, (_, i) => [`p${2 * i + 1}`, `p${2 * i + 2}`]);

// Comprueba que el resultado es un único ciclo que cubre a todos.
function expectSingleCycle(cycle: string[], participantIds: string[]) {
  expect([...cycle].sort()).toEqual([...participantIds].sort());
  const assignments = cycleToAssignments(cycle);
  // Todos regalan y reciben exactamente una vez.
  expect(new Set(assignments.values()).size).toBe(participantIds.length);
  for (const [giver, receiver] of assignments) {
    expect(receiver).not.toBe(giver);
    // Sin parejas cerradas A↔B.
    expect(assignments.get(receiver)).not.toBe(giver);
  }
  // Recorrer desde cualquiera visita a todos antes de volver.
  let current = participantIds[0];
  for (let step = 1; step < participantIds.length; step++) {
    current = assignments.get(current)!;
    expect(current).not.toBe(participantIds[0]);
  }
  expect(assignments.get(current)).toBe(participantIds[0]);
}

function expectPairsApart(cycle: string[], pairs: Pair[]) {
  const assignments = cycleToAssignments(cycle);
  for (const [a, b] of pairs) {
    expect(assignments.get(a)).not.toBe(b);
    expect(assignments.get(b)).not.toBe(a);
  }
}

// Forma canónica de un ciclo (rotado para empezar por p1), para contar
// cuántas veces sale cada uno.
function canonical(cycle: string[]): string {
  const start = cycle.indexOf('p1');
  return [...cycle.slice(start), ...cycle.slice(0, start)].join('>');
}

describe('drawCycle', () => {
  it('con 3 participantes devuelve un ciclo único válido', () => {
    const participantIds = ids(3);
    const cycle = drawCycle({
      participantIds,
      pairs: [],
      pairRuleEnabled: false,
    });
    expectSingleCycle(cycle, participantIds);
  });

  it('4 participantes con 2 parejas se resuelve sin que se toquen', () => {
    const participantIds = ids(4);
    const pairs = firstPairs(2);
    for (let i = 0; i < 200; i++) {
      const cycle = drawCycle({ participantIds, pairs, pairRuleEnabled: true });
      expectSingleCycle(cycle, participantIds);
      expectPairsApart(cycle, pairs);
    }
  });

  it('cumple las reglas para cualquier tamaño de 3 a 30 y cualquier número de parejas', () => {
    for (let n = 3; n <= 30; n++) {
      const participantIds = ids(n);
      for (let k = 0; k <= Math.floor(n / 2); k++) {
        if (n === 3 && k > 0) continue; // caso imposible, probado aparte
        const pairs = firstPairs(k);
        for (let run = 0; run < 10; run++) {
          const cycle = drawCycle({
            participantIds,
            pairs,
            pairRuleEnabled: true,
          });
          expectSingleCycle(cycle, participantIds);
          expectPairsApart(cycle, pairs);
        }
      }
    }
  });

  it('3 participantes con una pareja y la regla activa es imposible', () => {
    const input: DrawInput = {
      participantIds: ids(3),
      pairs: firstPairs(1),
      pairRuleEnabled: true,
    };
    expect(checkDrawFeasibility(input)).toEqual({
      ok: false,
      code: 'NO_SOLUTION',
    });
    expect(() => drawCycle(input)).toThrow(DrawError);
    expect(() => drawCycle(input)).toThrow('NO_SOLUTION');
  });

  it('con la regla desactivada, las parejas no impiden el sorteo', () => {
    const input: DrawInput = {
      participantIds: ids(3),
      pairs: firstPairs(1),
      pairRuleEnabled: false,
    };
    expect(checkDrawFeasibility(input)).toEqual({ ok: true });
    expectSingleCycle(drawCycle(input), ids(3));
  });

  it('cada ciclo posible sale con la misma frecuencia', () => {
    // Con 4 personas hay 3! = 6 ciclos distintos; se esperan ~1000 de cada.
    const counts = new Map<string, number>();
    for (let i = 0; i < 6000; i++) {
      const key = canonical(
        drawCycle({
          participantIds: ids(4),
          pairs: [],
          pairRuleEnabled: false,
        }),
      );
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      // ±150 son más de 5 desviaciones típicas: el test no falla por azar.
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });

  it('con parejas, los ciclos válidos salen con la misma frecuencia', () => {
    // 4 personas y 2 parejas: solo valen p1>p3>p2>p4 y p1>p4>p2>p3.
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const key = canonical(
        drawCycle({
          participantIds: ids(4),
          pairs: firstPairs(2),
          pairRuleEnabled: true,
        }),
      );
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(['p1>p3>p2>p4', 'p1>p4>p2>p3']);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(1800);
      expect(count).toBeLessThan(2200);
    }
  });

  it('usa el generador inyectado y nunca Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    const randomInt = vi.fn((min: number) => min);
    const cycle = drawCycle(
      { participantIds: ids(5), pairs: [], pairRuleEnabled: false },
      randomInt,
    );
    expect(randomInt).toHaveBeenCalled();
    expect(cycle).toEqual(['p2', 'p3', 'p4', 'p5', 'p1']);
    drawCycle({ participantIds: ids(5), pairs: [], pairRuleEnabled: false });
    expect(mathRandom).not.toHaveBeenCalled();
    mathRandom.mockRestore();
  });

  it('no modifica la lista de entrada', () => {
    const participantIds = ids(6);
    const copy = [...participantIds];
    drawCycle({ participantIds, pairs: [], pairRuleEnabled: false });
    expect(participantIds).toEqual(copy);
  });
});

describe('checkDrawFeasibility', () => {
  const ok = (participantIds: string[], pairs: Pair[] = []) =>
    checkDrawFeasibility({ participantIds, pairs, pairRuleEnabled: true });

  it('exige al menos 3 participantes', () => {
    expect(ok(ids(2))).toEqual({ ok: false, code: 'TOO_FEW_PARTICIPANTS' });
    expect(ok([])).toEqual({ ok: false, code: 'TOO_FEW_PARTICIPANTS' });
  });

  it('admite como mucho 30 participantes', () => {
    expect(ok(ids(30), firstPairs(15))).toEqual({ ok: true });
    expect(ok(ids(31))).toEqual({ ok: false, code: 'TOO_MANY_PARTICIPANTS' });
  });

  it.each<[string, string[], Pair[]]>([
    ['participantes repetidos', ['p1', 'p1', 'p2'], []],
    ['pareja consigo mismo', ids(4), [['p1', 'p1']]],
    ['pareja con alguien de fuera', ids(4), [['p1', 'p9']]],
    [
      'persona en dos parejas',
      ids(4),
      [
        ['p1', 'p2'],
        ['p1', 'p3'],
      ],
    ],
    [
      'pareja duplicada',
      ids(4),
      [
        ['p1', 'p2'],
        ['p2', 'p1'],
      ],
    ],
  ])('rechaza la entrada inválida: %s', (_, participantIds, pairs) => {
    expect(ok(participantIds, pairs)).toEqual({
      ok: false,
      code: 'INVALID_INPUT',
    });
    expect(() =>
      drawCycle({ participantIds, pairs, pairRuleEnabled: true }),
    ).toThrow('INVALID_INPUT');
  });
});
