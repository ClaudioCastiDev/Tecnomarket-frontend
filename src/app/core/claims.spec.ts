import { extractClaims } from './claims';

describe('extractClaims', () => {
  it('lee scopes, grupos, correo y expiración de los tokens de Cognito', () => {
    const claims = extractClaims(
      {
        scope: 'openid email rs-api-pedidos/pedidos-read',
        'cognito:groups': ['admin'],
        exp: 1789855775,
        username: 'abc-123',
        sub: 'sub-ana',
      },
      { email: 'ana@correo.cl' },
    );
    expect(claims.sub).toBe('sub-ana');

    expect(claims.usuario).toBe('ana@correo.cl');
    expect(claims.grupos).toEqual(['admin']);
    expect(claims.scopes).toContain('rs-api-pedidos/pedidos-read');
    expect(claims.scopes.length).toBe(3);
    expect(claims.expira?.getTime()).toBe(1789855775 * 1000);
  });

  it('sin grupos ni ID token usa el username y devuelve listas vacías', () => {
    const claims = extractClaims({ scope: 'openid', username: 'abc-123' }, undefined);

    expect(claims.usuario).toBe('abc-123');
    expect(claims.grupos).toEqual([]);
    expect(claims.expira).toBeNull();
  });
});
