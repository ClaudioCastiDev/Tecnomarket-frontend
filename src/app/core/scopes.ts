/** Scopes de los resource servers creados en Cognito (rs-api-pedidos y rs-api-productos). */
export const SCOPE_PEDIDOS_READ = 'rs-api-pedidos/pedidos-read';
export const SCOPE_PEDIDOS_WRITE = 'rs-api-pedidos/pedidos-write';
export const SCOPE_PRODUCTOS_READ = 'rs-api-productos/productos-read';
export const SCOPE_PRODUCTOS_WRITE = 'rs-api-productos/productos-write';

/**
 * Scopes que el front solicita al iniciar sesión.
 * - pedidos-write: permite crear pedidos, que es lo que dispara el flujo asíncrono
 *   (evento "pedido.creado" en RabbitMQ -> stock, ticket y notificación).
 * - productos-write NO se solicita: el catálogo es de solo lectura desde el front, y
 *   cualquier escritura sobre productos devuelve 403 (autorización por scope).
 *
 * Requisito en Cognito: el app client debe tener habilitado el scope
 * rs-api-pedidos/pedidos-write en "Custom scopes"; si no, el login falla con invalid_scope.
 */
export const SCOPES_SOLICITADOS = [
  'openid',
  'email',
  'profile',
  SCOPE_PEDIDOS_READ,
  SCOPE_PEDIDOS_WRITE,
  SCOPE_PRODUCTOS_READ,
] as const;
