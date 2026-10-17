import {
  cleanName,
  nameKey,
  PARTICIPANT_NAME_PATTERN,
  ROOM_NAME_PATTERN,
} from './names.js';

describe('cleanName', () => {
  it('quita espacios sobrantes', () => {
    expect(cleanName('  Ana   María ')).toBe('Ana María');
  });

  it('unifica la forma Unicode', () => {
    expect(cleanName('José')).toBe('José');
  });
});

describe('nameKey', () => {
  it('no distingue mayúsculas ni tildes', () => {
    expect(nameKey('Ana')).toBe(nameKey('ANA'));
    expect(nameKey('Ana')).toBe(nameKey('Aná'));
    expect(nameKey('José Luis')).toBe(nameKey('jose  luis'));
  });

  it('distingue la ñ de la n', () => {
    expect(nameKey('Peña')).not.toBe(nameKey('Pena'));
    expect(nameKey('PEÑA')).toBe(nameKey('peña'));
  });
});

describe('PARTICIPANT_NAME_PATTERN', () => {
  it.each(['Ana', "O'Connor", 'Ana-María', 'Luis M.', 'Pablo 2', 'Zoë'])(
    'acepta %s',
    (name) => expect(PARTICIPANT_NAME_PATTERN.test(name)).toBe(true),
  );

  it.each(['<script>', 'Ana!', '123', 'a@b', '😀'])('rechaza %s', (name) =>
    expect(PARTICIPANT_NAME_PATTERN.test(name)).toBe(false),
  );
});

describe('ROOM_NAME_PATTERN', () => {
  it.each([
    'Cena de Navidad',
    '¡Amigo invisible 2026!',
    'Familia (Pérez) & co.',
  ])('acepta %s', (name) => expect(ROOM_NAME_PATTERN.test(name)).toBe(true));

  it.each(['<b>Sala</b>', '...', 'Sala\nnueva'])('rechaza %s', (name) =>
    expect(ROOM_NAME_PATTERN.test(name)).toBe(false),
  );
});
