// Normalización de nombres de participantes y salas.

// Forma en que se guarda y se muestra: NFC, sin espacios en los extremos y
// con los espacios interiores colapsados.
export function cleanName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

// Clave para detectar nombres repetidos sin distinguir mayúsculas ni tildes.
// La ñ se conserva: «Peña» y «Pena» son nombres distintos.
export function nameKey(raw: string): string {
  return Array.from(cleanName(raw).toLocaleLowerCase('es'), (ch) =>
    ch === 'ñ' ? ch : ch.normalize('NFD').replace(/\p{M}/gu, ''),
  ).join('');
}

// Letras, números, espacios y ' - . ; al menos una letra.
export const PARTICIPANT_NAME_PATTERN = /^(?=.*\p{L})[\p{L}\p{N}' .-]+$/u;
export const PARTICIPANT_NAME_MAX = 30;

// Letras, números, espacios y puntuación habitual; sin < > ni controles.
export const ROOM_NAME_PATTERN =
  /^(?=.*[\p{L}\p{N}])[\p{L}\p{N} .,:;'"!¡?¿()&/+#·–-]+$/u;
export const ROOM_NAME_MIN = 3;
export const ROOM_NAME_MAX = 60;
