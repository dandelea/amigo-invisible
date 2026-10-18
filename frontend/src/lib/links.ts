// Enlaces de la app. Los tokens van en el fragmento (#): el navegador no
// los envía al servidor al cargar la página, así que no quedan en logs.

const origin = () => window.location.origin;

export const invitePath = (inviteCode: string) => `/s/${inviteCode}`;
export const managePath = (token: string) => `/o#${token}`;
export const personalPath = (token: string) => `/p#${token}`;

export const inviteUrl = (inviteCode: string) =>
  `${origin()}${invitePath(inviteCode)}`;
export const manageUrl = (token: string) => `${origin()}${managePath(token)}`;
export const personalUrl = (token: string) =>
  `${origin()}${personalPath(token)}`;

// Token del fragmento de la URL actual, o null si no tiene la forma de un
// token (32 bytes en base64url).
export function tokenFromHash(hash: string): string | null {
  const token = hash.replace(/^#/, '');
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
