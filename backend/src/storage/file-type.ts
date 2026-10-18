// Detección del tipo real de un archivo por sus primeros bytes (la
// extensión y el tipo que declara el navegador no son de fiar).

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface DetectedType {
  mime: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'pdf' | 'jpg' | 'png' | 'webp';
  label: 'PDF' | 'JPEG' | 'PNG' | 'WebP';
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length &&
  bytes.every((b, i) => buf[offset + i] === b);

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

export function detectFileType(buf: Buffer): DetectedType | null {
  if (startsWith(buf, ascii('%PDF-'))) {
    return { mime: 'application/pdf', extension: 'pdf', label: 'PDF' };
  }
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', extension: 'jpg', label: 'JPEG' };
  }
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', extension: 'png', label: 'PNG' };
  }
  if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) {
    return { mime: 'image/webp', extension: 'webp', label: 'WebP' };
  }
  return null;
}

// Nombre para mostrar y para la descarga: sin rutas ni caracteres de
// control, con la extensión del tipo real y como mucho 100 caracteres.
export function safeFileName(original: string, type: DetectedType): string {
  const base = original
    .normalize('NFC')
    .split(/[\\/]/)
    .pop()!
    .replace(/[\p{Cc}\p{Cf}"<>|:*?]/gu, '')
    .replace(/\.[^.]*$/, '')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 90);
  return `${base || 'lista-de-deseos'}.${type.extension}`;
}
