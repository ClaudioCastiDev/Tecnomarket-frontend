# Tecnomarket – Frontend

Aplicación Angular 22 (standalone, zoneless, signals) que consume los microservicios de Tecnomarket
a través de **Amazon API Gateway**, autenticando con **Amazon Cognito** mediante OAuth 2.0 / OpenID Connect
(**Authorization Code + PKCE**, con `state` y `nonce`) usando AWS Amplify Auth.

## Configuración (un solo archivo)

Edita `src/environments/environment.ts`:

| Campo | Dónde obtenerlo |
|---|---|
| `cognito.userPoolId` | Cognito → User pool → Overview |
| `cognito.userPoolClientId` | Cognito → User pool → App clients |
| `cognito.domain` | Cognito → Branding/App integration → Domain (sin `https://`) |
| `apiUrl` | API Gateway → Invoke URL de la etapa (sin `/` final) |

La URL de retorno del login es el origen desde el que se sirve la app (`http://localhost:4200` en desarrollo);
debe estar registrada en Cognito como *Allowed callback URL* y *Allowed sign-out URL*.

## Ejecutar

```powershell
npm install
npm start          # http://localhost:4200
npm test           # 13 pruebas unitarias
npm run build      # salida en dist/
```

Requiere Node.js 22.22.3 o superior.

## Estructura

```
src/app/
├── core/        auth.service (sesión, login con nonce, roles y scopes), guards, interceptor, servicios HTTP
├── pages/       inicio, pedidos, productos, perfil (claims y token), administración (solo grupo admin)
└── app.*        layout, rutas y configuración
```

| Ruta | Protección |
|---|---|
| `/` | pública |
| `/pedidos`, `/productos`, `/perfil` | `authGuard` (sesión iniciada) |
| `/admin` | `roleGuard('admin')` (claim `cognito:groups`) |

## Seguridad

- El interceptor adjunta el access token **solo** a las llamadas hacia `apiUrl`.
- El front solicita `pedidos-read`, `pedidos-write` y `productos-read`. **No** solicita `productos-write`,
  así que cualquier escritura sobre productos devuelve **403** (autorización por scope).
  El app client de Cognito debe tener habilitado `rs-api-pedidos/pedidos-write` en *Custom scopes*.
- Un token inválido o ausente es rechazado con **401** por el authorizer del API Gateway.
- Los roles se leen del claim `cognito:groups` y los scopes del claim `scope` del access token.

## Mensajería asíncrona (RabbitMQ)

Crear un pedido en **Pedidos** dispara el flujo asíncrono: el backend guarda el pedido y publica el evento
`pedido.creado`; productos descuenta el stock y mensajería genera el ticket y la notificación.

- El campo *Producto* sugiere los nombres del catálogo, porque productos descuenta el stock buscando por nombre.
- Para la demo, revisa **Productos** unos segundos después de crear el pedido: el stock habrá bajado.
- Si escribes un producto que no existe, el pedido se crea, pero el mensaje termina en la DLQ de stock.
