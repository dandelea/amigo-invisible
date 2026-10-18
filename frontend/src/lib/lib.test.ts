import {
  formatBudget,
  formatLongDate,
  formatShortDate,
  initialOf,
  todayIso,
} from './format';
import { tokenFromHash } from './links';
import { cleanName, PARTICIPANT_NAME_PATTERN } from './names';

describe('format', () => {
  it('formatea fechas como en los mockups', () => {
    expect(formatShortDate('2026-12-20')).toBe('20 dic 2026');
    // El 20/12/2026 es domingo (el ejemplo de los mockups decía sábado).
    expect(formatLongDate('2026-12-20')).toBe(
      'domingo 20 de diciembre de 2026',
    );
  });

  it('formatea importes en euros, con espacio de no separación', () => {
    expect(formatBudget(15)).toBe('15\u00a0€');
    expect(formatBudget(15.5)).toBe('15,50\u00a0€');
  });

  it('da la fecha de hoy en formato ISO', () => {
    expect(todayIso(new Date(2026, 9, 18, 23, 30))).toBe('2026-10-18');
  });

  it('saca la inicial en mayúscula', () => {
    expect(initialOf('ana')).toBe('A');
    expect(initialOf('  Óscar')).toBe('Ó');
  });
});

describe('tokenFromHash', () => {
  it('acepta un token de 43 caracteres en base64url', () => {
    const token = 'abcDEF123_-'.padEnd(43, 'x');
    expect(tokenFromHash(`#${token}`)).toBe(token);
  });

  it.each(['', '#', '#corto', `#${'a'.repeat(42)}!`])('rechaza «%s»', (hash) =>
    expect(tokenFromHash(hash)).toBeNull(),
  );
});

describe('names', () => {
  it('limpia espacios como el backend', () => {
    expect(cleanName('  Luis   M. ')).toBe('Luis M.');
  });

  it('aplica el mismo patrón de nombres que el backend', () => {
    expect(PARTICIPANT_NAME_PATTERN.test("O'Connor")).toBe(true);
    expect(PARTICIPANT_NAME_PATTERN.test('<b>')).toBe(false);
  });
});
