import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="encabezado">
      <h1>Mi cuenta</h1>
    </div>

    @if (auth.claims(); as c) {
      <section class="bloque">
        <dl class="datos">
          <dt>Usuario</dt>
          <dd>{{ c.usuario }}</dd>
          <dt>Tipo de cuenta</dt>
          <dd>{{ auth.isAdmin() ? 'Administrador' : 'Cliente' }}</dd>
          <dt>Sesión activa hasta</dt>
          <dd>{{ c.expira | date: 'd MMM y, HH:mm' }}</dd>
        </dl>
        <div class="acciones">
          <a class="btn" routerLink="/pedidos">Ver mis pedidos</a>
          <button class="btn ghost" (click)="auth.logout()">Cerrar sesión</button>
        </div>
      </section>
    }
  `,
})
export class PerfilPage {
  protected readonly auth = inject(AuthService);
}
