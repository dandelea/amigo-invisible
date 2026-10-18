import type { Plugin } from 'vite';

// Cabeceras de seguridad para Cloudflare Pages. Al compilar se genera
// dist/_headers, que Pages aplica a todas las respuestas. La CSP solo
// permite conectar con el propio sitio y con el backend (HTTP y WebSocket),
// cuya URL sale de VITE_API_URL.
export function securityHeaders(apiUrl: string): Plugin {
  return {
    name: 'amigo-security-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: buildHeaders(apiUrl),
      });
    },
  };
}

export function buildHeaders(apiUrl: string): string {
  const api = new URL(apiUrl);
  const ws = `${api.protocol === 'https:' ? 'wss:' : 'ws:'}//${api.host}`;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // Radix y algunos componentes usan atributos style en línea.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${api.origin} ${ws}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    // Los enlaces llevan códigos y tokens: no se envía la URL a otras webs.
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '',
  ].join('\n');
}
