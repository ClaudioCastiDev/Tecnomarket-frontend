import { Injectable, computed, signal } from '@angular/core';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { UserClaims, extractClaims } from './claims';

const NONCE_KEY = 'pedidos360_oidc_nonce';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _claims = signal<UserClaims | null>(null);
  private readonly _token = signal('');

  readonly claims = this._claims.asReadonly();
  readonly token = this._token.asReadonly();
  readonly error = signal('');
  readonly isAuthenticated = computed(() => this._claims() !== null);
  readonly isAdmin = computed(() => this.hasRole('admin'));

  constructor() {
    Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
        case 'signedIn':
          void this.refresh();
          break;
        case 'signedOut':
          this.clear();
          break;
        case 'signInWithRedirect_failure':
          this.error.set('No pudimos iniciar tu sesión. Intenta de nuevo.');
          break;
        default:
          break;
      }
    });
  }

  /** Se ejecuta al arrancar la aplicación (ver app.config.ts). */
  async init(): Promise<void> {
    await this.refresh();
  }

  /** Lee la sesión actual (Amplify renueva el token si hace falta) y actualiza el estado. */
  async refresh(): Promise<void> {
    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens?.accessToken) {
        this.clear();
        return;
      }
      const idPayload = tokens.idToken?.payload as Record<string, unknown> | undefined;

      if (!this.nonceValido(idPayload)) {
        this.error.set('Por seguridad cerramos tu sesión. Vuelve a iniciarla.');
        this.clear();
        await signOut();
        return;
      }

      this._claims.set(extractClaims(tokens.accessToken.payload as Record<string, unknown>, idPayload));
      this._token.set(tokens.accessToken.toString());
    } catch {
      this.clear();
    }
  }

  /**
   * Inicia el flujo Authorization Code con PKCE contra Cognito.
   * Se genera un nonce aleatorio, se envía en la petición /authorize y, al volver,
   * se comprueba que el ID token lo traiga igual (protección contra ataques de repetición).
   */
  async login(): Promise<void> {
    this.error.set('');
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(NONCE_KEY, nonce);
    await signInWithRedirect({ options: { nonce } });
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem(NONCE_KEY);
    await signOut();
  }

  hasRole(rol: string): boolean {
    return this._claims()?.grupos.includes(rol) ?? false;
  }

  hasScope(scope: string): boolean {
    return this._claims()?.scopes.includes(scope) ?? false;
  }

  private clear(): void {
    this._claims.set(null);
    this._token.set('');
  }

  /** Solo se valida cuando este navegador inició un login (hay un nonce guardado). */
  private nonceValido(idPayload: Record<string, unknown> | undefined): boolean {
    const esperado = sessionStorage.getItem(NONCE_KEY);
    if (!esperado) {
      return true;
    }
    if (idPayload?.['nonce'] !== esperado) {
      return false;
    }
    sessionStorage.removeItem(NONCE_KEY);
    return true;
  }
}
