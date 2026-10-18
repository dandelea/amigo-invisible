import { buildHeaders } from '../../security-headers';

describe('cabeceras de seguridad de Cloudflare Pages', () => {
  it('solo permite conectar con el sitio y con el backend (HTTP y WebSocket)', () => {
    const headers = buildHeaders('https://amigo-api.onrender.com');
    expect(headers).toMatch(/^\/\*\n/);
    expect(headers).toContain(
      "connect-src 'self' https://amigo-api.onrender.com wss://amigo-api.onrender.com",
    );
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).toContain('X-Frame-Options: DENY');
  });

  it('en local usa ws://', () => {
    expect(buildHeaders('http://localhost:3000')).toContain(
      'http://localhost:3000 ws://localhost:3000',
    );
  });
});
