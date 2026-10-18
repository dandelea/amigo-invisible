import { detectFileType, safeFileName } from './file-type.js';

const bytes = (...parts: (string | number[])[]) =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p) : Buffer.from(p))),
  );

describe('detectFileType', () => {
  it.each([
    ['PDF', bytes('%PDF-1.7\n'), 'application/pdf'],
    ['JPEG', bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]), 'image/jpeg'],
    [
      'PNG',
      bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      'image/png',
    ],
    ['WebP', bytes('RIFF', [0x24, 0, 0, 0], 'WEBPVP8 '), 'image/webp'],
  ])('reconoce %s por su contenido', (_, buf, mime) => {
    expect(detectFileType(buf)?.mime).toBe(mime);
  });

  it.each([
    ['texto con extensión .png', bytes('no soy una imagen')],
    ['SVG', bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['HTML', bytes('<!doctype html><script>alert(1)</script>')],
    ['GIF', bytes('GIF89a')],
    ['RIFF que no es WebP', bytes('RIFF', [0, 0, 0, 0], 'WAVE')],
    ['vacío', Buffer.alloc(0)],
  ])('rechaza %s', (_, buf) => {
    expect(detectFileType(buf)).toBeNull();
  });
});

describe('safeFileName', () => {
  const png = detectFileType(
    bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  )!;

  it('usa la extensión del tipo real', () => {
    expect(safeFileName('regalos 2026.exe', png)).toBe('regalos 2026.png');
  });

  it('quita rutas y caracteres peligrosos', () => {
    expect(safeFileName('../../etc/"pass<wd>".png', png)).toBe('passwd.png');
    expect(safeFileName('C:\\Users\\Ana\\lista.png', png)).toBe('lista.png');
  });

  it('pone un nombre por defecto si no queda nada', () => {
    expect(safeFileName('....', png)).toBe('lista-de-deseos.png');
  });

  it('limita la longitud', () => {
    expect(
      safeFileName('a'.repeat(300) + '.png', png).length,
    ).toBeLessThanOrEqual(100);
  });
});
