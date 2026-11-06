import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';

/**
 * Solo grupo admin (roleGuard). Aquí quedan los datos técnicos de la sesión que un cliente
 * no necesita ver: grupos, scopes del access token y el token para probar la API.
 */
@Component({
  selector: 'app-admin',
  imports: [DatePipe],
  template: `
    <div class="encabezado">
      <div>
        <h1>Administración</h1>
        <p>Datos técnicos de tu sesión, para pruebas y soporte.</p>
      </div>
    </div>

    @if (auth.claims(); as c) {
      <section class="bloque">
        <h2>Sesión y permisos</h2>
        <dl class="datos">
          <dt>Usuario</dt>
          <dd>{{ c.usuario }}</dd>
          <dt>Grupos de Cognito</dt>
          <dd>
            @for (g of c.grupos; track g) {
              <span class="chip">{{ g }}</span>
            } @empty {
              <span class="muted">Sin grupo</span>
            }
          </dd>
          <dt>Scopes del token</dt>
          <dd>
            @for (s of c.scopes; track s) {
              <span class="chip">{{ s }}</span>
            }
          </dd>
          <dt>El token expira</dt>
          <dd>{{ c.expira | date: 'dd-MM-yyyy HH:mm:ss' }}</dd>
        </dl>
      </section>

      <section class="bloque">
        <div class="encabezado">
          <h2>Access token</h2>
          <button class="btn ghost" (click)="copiar()">
            {{ copiado() ? 'Copiado' : 'Copiar token' }}
          </button>
        </div>
        <p class="muted">
          Úsalo como <code>Authorization: Bearer …</code> para probar la API en Postman. Es una
          credencial temporal: no la compartas.
        </p>
        <details>
          <summary>Mostrar token</summary>
          <textarea readonly rows="8" aria-label="Access token">{{ auth.token() }}</textarea>
        </details>
      </section>
    }
  `,
})
export class AdminPage {
  protected readonly auth = inject(AuthService);
  protected readonly copiado = signal(false);

  protected async copiar(): Promise<void> {
    await navigator.clipboard.writeText(this.auth.token());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }
}
