// Reglas de nombres, iguales que las del backend (backend/src/common/names.ts).

export function cleanName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export const PARTICIPANT_NAME_PATTERN = /^(?=.*\p{L})[\p{L}\p{N}' .-]+$/u;
export const PARTICIPANT_NAME_MAX = 30;

export const ROOM_NAME_PATTERN =
  /^(?=.*[\p{L}\p{N}])[\p{L}\p{N} .,:;'"!¡?¿()&/+#·–-]+$/u;
export const ROOM_NAME_MAX = 60;
