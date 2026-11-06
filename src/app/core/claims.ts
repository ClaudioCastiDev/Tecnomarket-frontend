export interface UserClaims {
  /** Claim "sub": el mismo identificador que guarda el backend en cada pedido (clienteSub). */
  sub: string;
  usuario: string;
  email: string;
  grupos: string[];
  scopes: string[];
  expira: Date | null;
}

type Payload = Record<string, unknown> | undefined;

/**
 * Extrae del access token y del ID token de Cognito lo que la aplicación necesita:
 * - "scope" (texto separado por espacios) -> lista de scopes
 * - "cognito:groups" -> roles del usuario
 * - "exp" -> fecha de expiración
 */
export function extractClaims(access: Payload, id: Payload): UserClaims {
  const scope = access?.['scope'];
  const groups = access?.['cognito:groups'];
  const exp = access?.['exp'];
  const email = id?.['email'];
  const username = access?.['username'];
  const sub = access?.['sub'];

  const correo = typeof email === 'string' ? email : '';
  return {
    sub: typeof sub === 'string' ? sub : '',
    usuario: correo || (typeof username === 'string' ? username : ''),
    email: correo,
    grupos: Array.isArray(groups) ? groups.filter((g): g is string => typeof g === 'string') : [],
    scopes: typeof scope === 'string' ? scope.split(' ').filter(Boolean) : [],
    expira: typeof exp === 'number' ? new Date(exp * 1000) : null,
  };
}
